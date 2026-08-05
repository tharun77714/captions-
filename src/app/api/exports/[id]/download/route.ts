import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@/lib/supabase/server';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: item } = await supabase.from('exports').select('storage_key, status, expires_at').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!item || item.status !== 'completed') return NextResponse.json({ error: 'Export not found' }, { status: 404 });
  if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'This export has expired' }, { status: 410 });

  const url = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: item.storage_key,
      ResponseContentDisposition: `attachment; filename="vidyut_export_${id.slice(0, 8)}.mp4"`,
    }),
    { expiresIn: 300 }
  );
  return NextResponse.redirect(url, 302);
}
