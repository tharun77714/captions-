import { NextResponse } from 'next/server';
import { r2PresignedGetUrl } from '@/lib/r2/presign';
import { createClient } from '@/lib/supabase/server';

/**
 * Proxy video streaming from R2 through Next.js to avoid browser CORS issues.
 * Uses manual AWS4 signing — the AWS SDK injects extra headers that Cloudflare R2
 * rejects on Vercel's runtime.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

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
      // Check if key matches media_url or export of a project owned by user
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

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 });
    }

    const presignedUrl = r2PresignedGetUrl(key, 300);

    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) fetchHeaders['range'] = rangeHeader;

    const r2Response = await fetch(presignedUrl, { headers: fetchHeaders });

    if (!r2Response.ok && r2Response.status !== 206) {
      const body = await r2Response.text();
      console.error('R2 fetch failed:', r2Response.status, body.substring(0, 300));
      return NextResponse.json({ error: 'Storage fetch failed' }, { status: 502 });
    }

    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';
    const filename = key.split('/').pop() || 'vidyut_export.mp4';

    const responseHeaders: Record<string, string> = {
      'Content-Type':  r2Response.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };

    if (isDownload) {
      responseHeaders['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    const contentLength = r2Response.headers.get('content-length');
    const contentRange  = r2Response.headers.get('content-range');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange)  responseHeaders['Content-Range']  = contentRange;

    return new Response(r2Response.body, {
      status:  r2Response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Video stream error:', err?.message);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}
