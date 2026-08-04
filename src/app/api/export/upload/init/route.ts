import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  try {
    const { projectId, exportId, contentType } = await request.json();

    if (!isUuid(projectId) || !isUuid(exportId)) {
      return NextResponse.json({ error: 'Missing projectId or exportId' }, { status: 400 });
    }

    if (contentType !== 'video/mp4') {
      return NextResponse.json({ error: 'Only video/mp4 contentType is supported' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: project, error: projectError } = await supabase
      .from('projects').select('user_id').eq('id', projectId).eq('user_id', user.id).single();

    if (projectError || !project) {
      console.error('[UploadInitAPI] Project validation failed:', projectError);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    if (!project.user_id) return NextResponse.json({ error: 'Inaccessible project owner' }, { status: 403 });

    // Keep the key deterministic and scoped to the authenticated project owner.
    const s3Key = `${user.id}/${projectId}/exports/${exportId}.mp4`;

    // 3. Generate a short-lived presigned PUT URL (valid for 15 minutes)
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: 'video/mp4',
    });

    const presignedUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 900 });

    console.log(`[UploadInitAPI] Generated PUT presigned URL for key: ${s3Key}`);

    // The completion route recomputes the same key; the client cannot choose an arbitrary R2 path.
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
