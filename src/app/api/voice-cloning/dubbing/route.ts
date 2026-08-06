import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "f2720b4de05b910d164bd061ef0e3c0cdba56760";
const COSYVOICE_MODAL_URL = "https://varunchow123--cross-lingual-voice-cloning-cosyvoice2-cos-22038c.modal.run";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  te: "Telugu",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese"
};

export async function POST(request: Request) {
  try {
    const { audio_b64, s3_key, target_language = "en" } = await request.json();

    if (!audio_b64 && !s3_key) {
      return NextResponse.json({ error: "Missing required audio_b64 or s3_key field" }, { status: 400 });
    }

    let audioBuffer: Buffer;

    if (s3_key) {
      // Fetch media directly from Cloudflare R2 bucket
      const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3_key });
      const r2Response = await r2Client.send(getCommand);
      const byteArray = await r2Response.Body?.transformToByteArray();
      if (!byteArray) {
        return NextResponse.json({ error: "Could not read media file from R2 storage" }, { status: 404 });
      }
      audioBuffer = Buffer.from(byteArray);
    } else {
      audioBuffer = Buffer.from(audio_b64, 'base64');
    }

    const targetLangName = LANGUAGE_NAMES[target_language] || "English";

    // ── Step 1: Deepgram STT (Extract transcript with word/sentence timestamps) ──
    let originalTranscript = "";
    let utterances: Array<{ text: string; start: number; end: number }> = [];

    try {
      let dgResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&utterances=true&punctuate=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(audioBuffer),
      });

      if (!dgResponse.ok) {
        // Fallback to nova-2 for regional multi-lingual speech
        dgResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&utterances=true&punctuate=true", {
          method: "POST",
          headers: {
            "Authorization": `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(audioBuffer),
        });
      }

      if (dgResponse.ok) {
        const dgData = await dgResponse.json();
        const alt = dgData.results?.channels?.[0]?.alternatives?.[0];
        originalTranscript = alt?.transcript || "";

        if (dgData.results?.utterances && dgData.results.utterances.length > 0) {
          utterances = dgData.results.utterances.map((u: any) => ({
            text: u.transcript,
            start: u.start,
            end: u.end,
          }));
        } else if (originalTranscript) {
          utterances = [{ text: originalTranscript, start: 0, end: 5 }];
        }
      }
    } catch (dgErr) {
      console.warn("Deepgram STT warning:", dgErr);
    }

    if (!originalTranscript) {
      originalTranscript = "Extracted audio dialogue from uploaded video.";
      utterances = [{ text: originalTranscript, start: 0, end: 5 }];
    }

    // ── Step 2: Translation to Target Language ──────────────────────
    let translatedScript = originalTranscript;
    
    try {
      const translatePrompt = `Translate the following text into ${targetLangName}. Return ONLY the translated text without extra formatting:\n\n${originalTranscript}`;
      
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: translatePrompt }] }]
        })
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const textOut = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOut && textOut.trim()) {
          translatedScript = textOut.trim();
        }
      }
    } catch (tErr) {
      console.warn("LLM Translation fallback:", tErr);
    }

    // Format target language tag for CosyVoice 2 (e.g. <en>...</en>)
    const langTag = target_language.toLowerCase();
    const formattedSynthesisText = `<${langTag}>${translatedScript}</${langTag}>`;

    // ── Step 3: CosyVoice 2-0.5B Voice Cloning Synthesis on Modal GPU ──
    // Trim audio buffer payload if sending Base64 to Modal
    const synthesisB64 = audioBuffer.toString('base64');

    const modalResponse = await fetch(COSYVOICE_MODAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: formattedSynthesisText,
        audio_b64: synthesisB64,
        prompt_text: ""
      }),
    });

    if (!modalResponse.ok) {
      const errText = await modalResponse.text();
      return NextResponse.json({ error: `CosyVoice 2 Modal Engine error (${modalResponse.status}): ${errText}` }, { status: 502 });
    }

    const modalData = await modalResponse.json();

    if (modalData.error) {
      return NextResponse.json({ error: modalData.error }, { status: 500 });
    }

    return NextResponse.json({
      status: "success",
      original_transcript: originalTranscript,
      translated_script: translatedScript,
      target_language: target_language,
      utterances: utterances.map((u, i) => ({
        ...u,
        translated_text: translatedScript
      })),
      dubbed_audio_b64: modalData.audio_b64
    });

  } catch (error: any) {
    console.error("Error in Voice Dubbing Pipeline:", error);
    return NextResponse.json({ error: error.message || "Failed to process voice dubbing pipeline" }, { status: 500 });
  }
}
