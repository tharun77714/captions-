import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

const MODAL_SYNTH_URL = "https://varunchow123--cross-lingual-voice-cloning-cosyvoice2-cos-5360a0.modal.run";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "f2720b4de05b910d164bd061ef0e3c0cdba56760";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", te: "Telugu", hi: "Hindi", ta: "Tamil",
  kn: "Kannada", es: "Spanish", fr: "French", de: "German", ja: "Japanese"
};

export async function POST(request: Request) {
  try {
    const { s3_key, audio_b64, source_language = "auto", target_language = "en" } = await request.json();

    if (!s3_key && !audio_b64) {
      return NextResponse.json({ error: "Missing audio_b64 or s3_key" }, { status: 400 });
    }

    // ── Step 1: Download from R2 in Next.js (native, no limits) ──────────────
    let audioBuffer: Buffer;
    if (s3_key) {
      const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3_key });
      const r2Res = await r2Client.send(getCmd);
      const bytes = await r2Res.Body?.transformToByteArray();
      if (!bytes) return NextResponse.json({ error: "Could not read media file from R2" }, { status: 404 });
      audioBuffer = Buffer.from(bytes);
    } else {
      audioBuffer = Buffer.from(audio_b64, 'base64');
    }

    // ── Step 2: Deepgram STT in Next.js ──────────────────────────────────────
    // Nova-2 with explicit language for regional langs, Nova-3 detect for auto/en
    const regionalLangs = new Set(["te", "hi", "ta", "kn", "es", "fr", "de", "ja"]);
    let sttUrl: string;
    if (regionalLangs.has(source_language)) {
      sttUrl = `https://api.deepgram.com/v1/listen?model=nova-2&language=${source_language}&smart_format=true&utterances=true&punctuate=true`;
    } else {
      sttUrl = `https://api.deepgram.com/v1/listen?model=nova-3&detect_language=true&smart_format=true&utterances=true&punctuate=true`;
    }

    let originalTranscript = "";
    let utterances: Array<{ text: string; start: number; end: number }> = [];

    const dgRes = await fetch(sttUrl, {
      method: "POST",
      headers: { "Authorization": `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "application/octet-stream" },
      body: new Uint8Array(audioBuffer),
    });

    if (dgRes.ok) {
      const dgData = await dgRes.json();
      const alt = dgData.results?.channels?.[0]?.alternatives?.[0];
      originalTranscript = alt?.transcript?.trim() || "";
      const rawUtts = dgData.results?.utterances || [];
      if (rawUtts.length > 0) {
        utterances = rawUtts.map((u: any) => ({ text: u.transcript, start: u.start, end: u.end }));
      } else if (originalTranscript) {
        utterances = [{ text: originalTranscript, start: 0, end: 5 }];
      }
      console.log("Deepgram transcript:", originalTranscript.slice(0, 80));
    } else {
      const errTxt = await dgRes.text();
      console.error("Deepgram error:", dgRes.status, errTxt);
    }

    // Fallback to nova-2-general if first attempt gave empty
    if (!originalTranscript) {
      const fallbackUrl = regionalLangs.has(source_language)
        ? `https://api.deepgram.com/v1/listen?model=nova-2-general&language=${source_language}&smart_format=true&utterances=true&punctuate=true`
        : `https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true&smart_format=true&utterances=true&punctuate=true`;

      const dgRes2 = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Authorization": `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "application/octet-stream" },
        body: new Uint8Array(audioBuffer),
      });
      if (dgRes2.ok) {
        const dgData2 = await dgRes2.json();
        const alt2 = dgData2.results?.channels?.[0]?.alternatives?.[0];
        originalTranscript = alt2?.transcript?.trim() || "";
        const rawUtts2 = dgData2.results?.utterances || [];
        if (rawUtts2.length > 0) {
          utterances = rawUtts2.map((u: any) => ({ text: u.transcript, start: u.start, end: u.end }));
        } else if (originalTranscript) {
          utterances = [{ text: originalTranscript, start: 0, end: 5 }];
        }
        console.log("Deepgram fallback transcript:", originalTranscript.slice(0, 80));
      }
    }

    if (!originalTranscript) {
      originalTranscript = "Unable to extract speech. Please ensure the video has clear audible dialogue.";
      utterances = [{ text: originalTranscript, start: 0, end: 5 }];
    }

    // ── Step 3: Gemini 1.5 Translation in Next.js ─────────────────────────────
    const targetLangName = LANGUAGE_NAMES[target_language] || "English";
    let translatedScript = originalTranscript;

    if (source_language !== target_language) {
      try {
        const prompt = `You are a professional voice director. Translate the following speech into natural, conversational ${targetLangName}. Add natural punctuation (commas, periods, exclamation points) so it flows like a real human creator, not a robot. Return ONLY the translated text:\n\n${originalTranscript}`;
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY || ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (gemRes.ok) {
          const gData = await gemRes.json();
          const textOut = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (textOut) translatedScript = textOut;
        }
      } catch (e) {
        console.warn("Gemini translation fallback:", e);
      }
    }

    // ── Step 4: Modal CosyVoice 2 — send ONLY s3_key + translated text ────────
    const langTag = target_language.toLowerCase();
    const formattedText = `<${langTag}>${translatedScript}</${langTag}>`;

    const modalRes = await fetch(MODAL_SYNTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        s3_key: s3_key || undefined,
        audio_b64: !s3_key ? audio_b64 : undefined,
        translated_text: formattedText,
        target_language: target_language
      }),
    });

    if (!modalRes.ok) {
      const errText = await modalRes.text();
      return NextResponse.json({ error: `CosyVoice 2 error (${modalRes.status}): ${errText}` }, { status: 502 });
    }

    const modalData = await modalRes.json();
    if (modalData.error) return NextResponse.json({ error: modalData.error }, { status: 500 });

    return NextResponse.json({
      status: "success",
      original_transcript: originalTranscript,
      translated_script: translatedScript,
      target_language,
      utterances,
      dubbed_audio_b64: modalData.audio_b64 || modalData.dubbed_audio_b64
    });

  } catch (error: any) {
    console.error("Voice Dubbing Pipeline Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process voice dubbing pipeline" }, { status: 500 });
  }
}
