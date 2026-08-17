import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    let isAuthorized = false;

    if (key.startsWith(`${user.id}/`)) {
      isAuthorized = true;
    } else {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, media_url, export_url')
        .eq('user_id', user.id);

      if (projects && projects.length > 0) {
        for (const p of projects) {
          if (p.media_url === key || p.export_url?.includes(key) || key.includes(p.id)) {
            isAuthorized = true;
            break;
          }
        }
      }
    }

    if (!isAuthorized) return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 });

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Cloudflare R2 returns 403 when the presigned URL includes
    // x-amz-checksum-mode=ENABLED (added by AWS SDK v3 by default) because
    // objects uploaded without checksums fail validation on R2's side.
    // unhoistableHeaders tells the signer NOT to include that header in the URL.
    const url = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
      unhoistableHeaders: new Set(['x-amz-checksum-mode']),
    });

    return NextResponse.json({ url });
  } catch (error: unknown) {
    console.error('Error generating video URL:', error);
    return NextResponse.json({ error: 'Failed to generate video URL' }, { status: 500 });
  }
}
