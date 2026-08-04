import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  try {
    const { projectId, exportId } = await request.json();
    if (!isUuid(projectId) || !isUuid(exportId)) return NextResponse.json({ error: 'Missing or invalid projectId/exportId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: project } = await supabase.from('projects').select('id')
      .eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if (!project) return NextResponse.json({ success: true });

    const storageKey = `${user.id}/${projectId}/exports/${exportId}.mp4`;
    await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: storageKey })).catch(() => undefined);
    await supabase.from('projects').update({ export_status: 'failed', export_error: 'Export cancelled' })
      .eq('id', projectId).eq('user_id', user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ExportCancel] Failed:', error);
    return NextResponse.json({ error: 'Could not cancel export' }, { status: 500 });
  }
}
