import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';

/**
 * Proxy video streaming from R2 through Next.js to avoid CORS issues.
 * The browser fetches from /api/video/stream?key=... (same origin),
 * and this route fetches from R2 server-side and streams bytes back.
 * This also supports Range requests for seek/scrub to work correctly.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const rangeHeader = request.headers.get('range');

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const s3Response = await r2Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'No content returned from storage' }, { status: 404 });
    }

    const contentType = s3Response.ContentType || 'video/mp4';
    const contentLength = s3Response.ContentLength;
    const contentRange = s3Response.ContentRange;
    const statusCode = contentRange ? 206 : 200;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };

    if (contentLength != null) {
      headers['Content-Length'] = String(contentLength);
    }
    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }

    // Stream the body from R2 directly to the browser response
    const stream = s3Response.Body.transformToWebStream();
    return new Response(stream, { status: statusCode, headers });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    console.error('Video stream error:', err);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}
