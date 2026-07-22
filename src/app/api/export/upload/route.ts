import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const file = formData.get('file') as File;

    if (!projectId || !file) {
      return NextResponse.json({ error: 'Missing projectId or file' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch the project to get the user_id (for the key namespace)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.warn('[UploadAPI] Project not found or DB error, using anon_user fallback:', projectError);
    }

    const userId = project?.user_id || 'anon_user';
    const s3Key = `${userId}/${projectId}/export.mp4`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload the MP4 file to R2
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: 'video/mp4',
    });

    await r2Client.send(putCommand);
    console.log(`[UploadAPI] Uploaded export for ${projectId} to R2 at key ${s3Key}`);

    // 3. Update the projects table
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        export_status: 'completed',
        export_url: s3Key,
        export_error: null,
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('[UploadAPI] Failed to update project in Supabase:', updateError);
      // We still proceed since the file was successfully written and we can return it.
    }

    // 4. Generate a signed download URL valid for 1 hour
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      key: s3Key,
    });
  } catch (error: unknown) {
    console.error('[UploadAPI] Upload handler failed:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
