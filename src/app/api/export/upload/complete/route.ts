import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { projectId, exportId } = await request.json();

    if (!projectId || !exportId) {
      return NextResponse.json({ error: 'Missing projectId or exportId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // 1. Validate that the project exists and the user has access.
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('[UploadCompleteAPI] Project validation failed:', projectError);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const userId = project.user_id;
    if (!userId) return NextResponse.json({ error: 'Inaccessible project owner' }, { status: 403 });

    const admin = createAdminClient();
    const { data: exportRow } = await admin.from('exports').select('storage_key, status, expires_at')
      .eq('id', exportId).eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
    if (!exportRow || !['rendering', 'uploading'].includes(exportRow.status)) {
      return NextResponse.json({ error: 'Export authorization is missing or expired' }, { status: 409 });
    }
    if (exportRow.expires_at && new Date(exportRow.expires_at).getTime() <= Date.now()) {
      await admin.from('exports').update({ status: 'failed' }).eq('id', exportId).eq('user_id', user.id);
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'export', p_reference_id: exportId });
      return NextResponse.json({ error: 'This export authorization has expired. Please retry.' }, { status: 410 });
    }

    // 2. Recompute canonical key (Do not let client specify arbitrary key)
    const s3Key = exportRow.storage_key;

    // 3. Query R2 metadata to verify the file was actually uploaded and check size
    let fileSize = 0;
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });
      const metadata = await r2Client.send(headCommand);

      fileSize = metadata.ContentLength || 0;
      console.log(`[UploadCompleteAPI] Verified file size on R2: ${fileSize} bytes`);

      // Reasonability checks: video must be > 10KB and < 500MB
      if (fileSize < 10240) {
        return NextResponse.json({ error: 'Uploaded video file is too small or corrupt' }, { status: 400 });
      }
      if (fileSize > 524288000) {
        return NextResponse.json({ error: 'Uploaded video file exceeds maximum allowed size' }, { status: 400 });
      }
    } catch (headError) {
      console.error('[UploadCompleteAPI] File not found in R2 storage:', headError);
      return NextResponse.json({ error: 'Exported MP4 file was not found in R2 storage' }, { status: 400 });
    }

    // 4. Update the projects table status in database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        export_status: 'completed',
        export_url: s3Key,
        export_error: null,
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('[UploadCompleteAPI] Failed to update project in Supabase:', updateError);
      return NextResponse.json({ error: 'Failed to save export status to database' }, { status: 500 });
    }

    const { error: exportUpdateError } = await admin.from('exports').update({
      status: 'completed',
      file_size: fileSize,
      completed_at: new Date().toISOString(),
    }).eq('id', exportId).eq('user_id', user.id);
    if (exportUpdateError) {
      console.error('[UploadCompleteAPI] Failed to save export library row:', exportUpdateError);
      return NextResponse.json({ error: 'Failed to save export record' }, { status: 500 });
    }

    // 5. Generate signed download URL (valid for 1 hour)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (error: unknown) {
    console.error('[UploadCompleteAPI] Complete handler failed:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
