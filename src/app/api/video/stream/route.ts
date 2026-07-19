import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

/**
 * Proxy video streaming from R2 through Next.js to avoid browser CORS issues.
 *
 * Strategy: generate a presigned URL server-side (which works fine),
 * then fetch it using plain fetch() — this avoids the SignatureDoesNotMatch
 * error caused by AWS SDK v3 injecting extra headers (amz-sdk-invocation-id,
 * x-amz-user-agent) into the canonical request that Cloudflare R2 rejects.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    // Generate a short-lived presigned URL server-side
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 300,
      unhoistableHeaders: new Set(['x-amz-checksum-mode']),
    });

    // Forward Range header from browser for seek/scrub support
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) fetchHeaders['range'] = rangeHeader;

    // Fetch from R2 using the presigned URL (plain fetch — no SDK overhead)
    const r2Response = await fetch(presignedUrl, { headers: fetchHeaders });

    if (!r2Response.ok && r2Response.status !== 206) {
      const body = await r2Response.text();
      console.error('R2 fetch failed:', r2Response.status, body.substring(0, 200));
      return NextResponse.json({ error: 'Storage fetch failed', status: r2Response.status }, { status: 502 });
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': r2Response.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };

    const contentLength = r2Response.headers.get('content-length');
    const contentRange = r2Response.headers.get('content-range');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new Response(r2Response.body, {
      status: r2Response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Video stream error:', err?.message);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}

