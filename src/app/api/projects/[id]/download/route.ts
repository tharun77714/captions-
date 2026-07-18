import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id, export_status, export_url')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    if (project.export_status !== 'completed' || !project.export_url) {
      return NextResponse.json({ error: 'Export is not completed yet' }, { status: 400 });
    }

    let key = project.export_url;
    if (key.includes('.cloudflarestorage.com/')) {
      key = key.split('.cloudflarestorage.com/')[1];
    } else if (key.startsWith('http')) {
      key = key.split('/').slice(3).join('/');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return NextResponse.json({ url });
  } catch (error: unknown) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
