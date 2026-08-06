import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

const MODAL_FULL_PIPELINE_URL = "https://varunchow123--cross-lingual-voice-cloning-cosyvoice2-cos-5360a0.modal.run";

export async function POST(request: Request) {
  try {
    const { audio_b64, s3_key, source_language = "auto", target_language = "en" } = await request.json();

    if (!audio_b64 && !s3_key) {
      return NextResponse.json({ error: "Missing required audio_b64 or s3_key field" }, { status: 400 });
    }

    let payloadB64: string;

    if (s3_key) {
      // Fetch media directly from Cloudflare R2 bucket
      const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3_key });
      const r2Response = await r2Client.send(getCommand);
      const byteArray = await r2Response.Body?.transformToByteArray();
      if (!byteArray) {
        return NextResponse.json({ error: "Could not read media file from R2 storage" }, { status: 404 });
      }
      payloadB64 = Buffer.from(byteArray).toString('base64');
    } else {
      payloadB64 = audio_b64;
    }

    // Call Modal GPU Full Pipeline (FFmpeg audio extract -> Deepgram STT -> Gemini Translate -> CosyVoice 2)
    const modalResponse = await fetch(MODAL_FULL_PIPELINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_b64: payloadB64,
        source_language: source_language,
        target_language: target_language
      }),
    });

    if (!modalResponse.ok) {
      const errText = await modalResponse.text();
      return NextResponse.json({ error: `Modal Dubbing Pipeline error (${modalResponse.status}): ${errText}` }, { status: 502 });
    }

    const modalData = await modalResponse.json();

    if (modalData.error) {
      return NextResponse.json({ error: modalData.error }, { status: 500 });
    }

    return NextResponse.json(modalData);

  } catch (error: any) {
    console.error("Error in Voice Dubbing Pipeline:", error);
    return NextResponse.json({ error: error.message || "Failed to process voice dubbing pipeline" }, { status: 500 });
  }
}
