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

    const dolbyApiKey = process.env.DOLBY_API_KEY;
    if (!dolbyApiKey) {
      return NextResponse.json({
        error: 'Dolby.io API Key is missing. Please add DOLBY_API_KEY to your Vercel environment variables.',
        requiresKey: true,
      }, { status: 400 });
    }

    // 1. Generate Input Presigned GET URL for Dolby
    const inputGetCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: project.media_url,
    });
    const inputUrl = await getSignedUrl(r2Client, inputGetCommand, { expiresIn: 3600 });

    // 2. Generate Output Presigned PUT URL for enhanced media
    const outputKey = `${user.id}/${projectId}/enhanced_${Date.now()}.mp4`;
    const outputPutCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: outputKey,
      ContentType: 'video/mp4',
    });
    const outputUrl = await getSignedUrl(r2Client, outputPutCommand, { expiresIn: 3600 });

    // 3. Initiate Dolby.io Media Enhance Job
    console.log('[DolbyEnhanceAPI] Submitting job to Dolby.io Media Enhance API...');
    const dolbyRes = await fetch('https://api.dolby.com/media/enhance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dolbyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: inputUrl,
        output: outputUrl,
        audio: {
          noise: { reduction: { amount: 'max' } },
          loudness: { enable: true, target_level: -14 },
          speech: { isolation: { enable: true } },
        },
      }),
    });

    if (!dolbyRes.ok) {
      const dolbyErr = await dolbyRes.json().catch(() => ({}));
      console.error('[DolbyEnhanceAPI] Dolby API returned error:', dolbyErr);
      return NextResponse.json({ error: dolbyErr.detail || dolbyErr.message || 'Dolby API request failed' }, { status: dolbyRes.status });
    }

    const dolbyData = await dolbyRes.json();
    const jobId = dolbyData.job_id;
    console.log('[DolbyEnhanceAPI] Dolby job started with ID:', jobId);

    // 4. Poll Dolby Job status (up to 60s)
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 30) {
      await new Promise(res => setTimeout(res, 2000));
      attempts++;

      const statusRes = await fetch(`https://api.dolby.com/media/enhance?job_id=${jobId}`, {
        headers: { 'Authorization': `Bearer ${dolbyApiKey}` },
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        console.log(`[DolbyEnhanceAPI] Poll attempt ${attempts}: status=${statusData.status}, progress=${statusData.progress}%`);

        if (statusData.status === 'Success') {
          completed = true;
        } else if (statusData.status === 'Failed') {
          throw new Error(statusData.error?.reason || 'Dolby audio enhancement job failed.');
        }
      }
    }

    if (!completed) {
      return NextResponse.json({ error: 'Dolby audio enhancement timed out. Please retry.' }, { status: 504 });
    }

    // 5. Update Project media_url in DB to the enhanced file
    await supabase.from('projects').update({ media_url: outputKey }).eq('id', projectId);

    return NextResponse.json({
      success: true,
      enhancedMediaKey: outputKey,
      message: 'Audio successfully enhanced with Dolby.io AI Voice Isolation!',
    });

  } catch (error: unknown) {
    console.error('[DolbyEnhanceAPI] Enhance error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
