import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';
import { MAX_UPLOAD_BYTES, getVideoUploadDescriptor } from '@/lib/upload-policy';
import { createAdminClient } from '@/lib/supabase/admin';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { projectId, title, s3Key, durationMs, sourceLanguage, fileSize, contentType } = await request.json();

    if (!isUuid(projectId) || !title || !s3Key) {
      return NextResponse.json({ error: 'Missing or invalid project upload details' }, { status: 400 });
    }

    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Invalid video size' }, { status: 400 });
    }

    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return NextResponse.json({ error: 'Could not read the video duration. Please try the file again.' }, { status: 400 });
    }

    const descriptor = getVideoUploadDescriptor(title, contentType);
    if (!descriptor) {
      return NextResponse.json({ error: 'Unsupported video type' }, { status: 415 });
    }

    const expectedKey = `${user.id}/${projectId}/raw.${descriptor.extension}`;
    if (s3Key !== expectedKey) {
      return NextResponse.json({ error: 'Upload key does not match the initialized project' }, { status: 400 });
    }

    // Do not create a project until R2 confirms the browser upload completed.
    let storedSize = 0;
    try {
      const metadata = await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
      storedSize = metadata.ContentLength || 0;
    } catch (error) {
      console.error('R2 upload verification failed:', error);
      return NextResponse.json({ error: 'The video did not finish uploading. Please retry.' }, { status: 400 });
    }

    if (storedSize !== fileSize) {
      return NextResponse.json({ error: 'Uploaded video size could not be verified. Please retry.' }, { status: 400 });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title,
        media_url: s3Key,
        duration_ms: Math.round(durationMs),
        status: 'queued',
        user_id: user.id,
        id: projectId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const admin = createAdminClient();
    const reservation = await admin.rpc('reserve_usage', {
      p_user_id: user.id,
      p_resource: 'transcription',
      p_amount: Math.max(1, Math.ceil(durationMs / 1000)),
      p_reference_id: project.id,
    });

    if (reservation.error) {
      await supabase.from('projects').delete().eq('id', project.id).eq('user_id', user.id);
      await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })).catch(() => undefined);
      console.error('Usage reservation failed:', reservation.error);
      return NextResponse.json({ error: 'Usage limits are not ready. Apply the billing migration first.' }, { status: 503 });
    }

    const reservationResult = reservation.data as { allowed?: boolean; used?: number; limit?: number } | null;
    if (!reservationResult?.allowed) {
      await supabase.from('projects').delete().eq('id', project.id).eq('user_id', user.id);
      await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })).catch(() => undefined);
      return NextResponse.json({ error: `This upload exceeds your plan limit (${reservationResult?.limit ?? 0} seconds remaining limit). Upgrade your plan to continue.` }, { status: 429 });
    }

    // Trigger Modal Worker with a timeout so a dead webhook cannot leave the browser hanging.
    const modalWebhookUrl = process.env.MODAL_WEBHOOK_URL;
    if (!modalWebhookUrl) {
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'transcription', p_reference_id: project.id });
      await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
      return NextResponse.json({ error: 'Transcription worker is not configured' }, { status: 503 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let modalResponse: Response;
    try {
      modalResponse = await fetch(modalWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          s3_key: s3Key,
          source_language: sourceLanguage || 'auto'
        }),
        signal: controller.signal,
      });
    } catch (error) {
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'transcription', p_reference_id: project.id });
      await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
      return NextResponse.json({ error: `Could not start transcription: ${readErrorMessage(error)}` }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!modalResponse.ok) {
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'transcription', p_reference_id: project.id });
      await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
      return NextResponse.json({ error: `Transcription worker rejected the video (${modalResponse.status})` }, { status: 502 });
    }

    return NextResponse.json({ projectId: project.id });
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
