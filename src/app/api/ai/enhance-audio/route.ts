import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { projectId } = body;
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    // Fetch project media URL
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, media_url, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projErr || !project || !project.media_url) {
      return NextResponse.json({ error: 'Project or media file not found' }, { status: 404 });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.DOLBY_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json({
        error: 'ElevenLabs API Key is missing. Please add ELEVENLABS_API_KEY to your Vercel environment variables.',
        requiresKey: true,
      }, { status: 400 });
    }

    // 1. Fetch source media file from Cloudflare R2
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: project.media_url,
    });
    const mediaGetUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 900 });

    console.log('[AudioEnhanceAPI] Fetching source media from R2...');
    const mediaRes = await fetch(mediaGetUrl);
    if (!mediaRes.ok) throw new Error('Failed to download source media from storage');
    const mediaBlob = await mediaRes.blob();

    // 2. Call ElevenLabs Voice Isolator API
    console.log('[AudioEnhanceAPI] Sending media to ElevenLabs Voice Isolator API...');
    const formData = new FormData();
    formData.append('audio', mediaBlob, 'input_audio.mp4');

    const elevenRes = await fetch('https://api.elevenlabs.io/v1/audio-isolation', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: formData,
    });

    if (!elevenRes.ok) {
      const elevenErr = await elevenRes.json().catch(() => ({}));
      console.error('[AudioEnhanceAPI] ElevenLabs API error:', elevenErr);
      const msg = elevenErr.detail?.message || elevenErr.message || `ElevenLabs API request failed (${elevenRes.status})`;
      return NextResponse.json({ error: msg }, { status: elevenRes.status });
    }

    const enhancedAudioBuffer = await elevenRes.arrayBuffer();
    console.log('[AudioEnhanceAPI] Voice isolated audio received from ElevenLabs:', enhancedAudioBuffer.byteLength, 'bytes');

    // 3. Upload enhanced audio file back to R2 storage
    const outputKey = `${user.id}/${projectId}/enhanced_${Date.now()}.mp3`;
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: outputKey,
      ContentType: 'audio/mp3',
    });
    const putUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 900 });

    const uploadRes = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mp3' },
      body: Buffer.from(enhancedAudioBuffer),
    });

    if (!uploadRes.ok) throw new Error('Failed to upload isolated audio back to Cloudflare R2 storage');

    // 4. Update project in database
    await supabase.from('projects').update({ media_url: outputKey }).eq('id', projectId);

    return NextResponse.json({
      success: true,
      enhancedMediaKey: outputKey,
      message: 'Audio successfully isolated & enhanced with ElevenLabs AI Voice Isolator!',
    });

  } catch (error: unknown) {
    console.error('[AudioEnhanceAPI] Enhance error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
