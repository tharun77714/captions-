import { NextResponse } from 'next/server';

const MODAL_FULL_PIPELINE_URL = "https://varunchow123--cross-lingual-voice-cloning-cosyvoice2-cos-5360a0.modal.run";

export async function POST(request: Request) {
  try {
    const { audio_b64, s3_key, source_language = "auto", target_language = "en" } = await request.json();

    if (!audio_b64 && !s3_key) {
      return NextResponse.json({ error: "Missing required audio_b64 or s3_key field" }, { status: 400 });
    }

    // Call Modal GPU Full Pipeline — pass s3_key directly (no base64 payload limit!)
    const modalResponse = await fetch(MODAL_FULL_PIPELINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        s3_key: s3_key || undefined,
        audio_b64: !s3_key ? audio_b64 : undefined,
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
