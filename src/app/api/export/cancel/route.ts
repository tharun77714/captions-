import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function POST(request: Request) {
  try {
    const { exportId } = await request.json();
    if (!exportId || typeof exportId !== 'string') return NextResponse.json({ error: 'Missing exportId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const admin = createAdminClient();
    const { data: item } = await admin.from('exports')
      .select('id, storage_key, status')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!item) return NextResponse.json({ success: true });

    if (item.status !== 'completed') {
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'export', p_reference_id: exportId });
      await admin.from('exports').update({ status: 'cancelled' }).eq('id', exportId).eq('user_id', user.id);
      await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: item.storage_key })).catch(() => undefined);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ExportCancel] Failed:', error);
    return NextResponse.json({ error: 'Could not cancel export' }, { status: 500 });
  }
}
