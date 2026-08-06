import { NextResponse } from 'next/server';

const MODAL_SVARA_PIPELINE_URL = process.env.MODAL_SVARA_PIPELINE_URL || "YOUR_SVARA_MODAL_URL_HERE";

export async function POST(request: Request) {
  try {
    const { s3_key, audio_b64, source_language = "auto", target_language = "te" } = await request.json();

    if (!s3_key && !audio_b64) {
      return NextResponse.json({ error: "Missing audio_b64 or s3_key" }, { status: 400 });
    }

    if (MODAL_SVARA_PIPELINE_URL === "YOUR_SVARA_MODAL_URL_HERE") {
        return NextResponse.json({ error: "Svara-TTS Modal URL not configured in Vercel environment variables." }, { status: 500 });
    }

    // Pass directly to Modal
    const modalRes = await fetch(MODAL_SVARA_PIPELINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s3_key, audio_b64: !s3_key ? audio_b64 : undefined, source_language, target_language }),
    });

    if (!modalRes.ok) {
      const errText = await modalRes.text();
      return NextResponse.json({ error: `Pipeline error (${modalRes.status}): ${errText}` }, { status: 502 });
    }

    const data = await modalRes.json();
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process pipeline" }, { status: 500 });
  }
}
