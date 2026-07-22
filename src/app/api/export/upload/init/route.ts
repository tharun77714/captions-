import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function POST(request: Request) {
  try {
    const { projectId, contentType } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    if (contentType !== 'video/mp4') {
      return NextResponse.json({ error: 'Only video/mp4 contentType is supported' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Validate that the project exists and the user has access.
    // In our DB model, projects has user_id. Let's make sure it is found.
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[UploadInitAPI] Project validation failed:', projectError);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const userId = project.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'Inaccessible project owner' }, { status: 403 });
    }

    // 2. Generate canonical R2 export key
    const s3Key = `${userId}/${projectId}/export.mp4`;

    // 3. Generate a short-lived presigned PUT URL (valid for 15 minutes)
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: 'video/mp4',
    });

    const presignedUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 900 });

    console.log(`[UploadInitAPI] Generated PUT presigned URL for key: ${s3Key}`);

    // Return the URL and the canonical key. 
    // We also return the key name so complete route can verify it, but complete route will compute it again from projectId to prevent client spoofing.
    return NextResponse.json({
      url: presignedUrl,
      key: s3Key,
    });
  } catch (error: unknown) {
    console.error('[UploadInitAPI] Failed to initialize upload:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
