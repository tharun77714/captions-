import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, BUCKET_NAME } from '@/lib/r2/client';
import { v4 as uuidv4 } from 'uuid';
import { MAX_UPLOAD_BYTES, getVideoUploadDescriptor } from '@/lib/upload-policy';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Video must be larger than 0 bytes and no larger than 500 MB' }, { status: 413 });
    }

    const descriptor = getVideoUploadDescriptor(filename, contentType);
    if (!descriptor) {
      return NextResponse.json({ error: 'Unsupported video. Upload an MP4, MOV, or WEBM file.' }, { status: 415 });
    }

    const userId = user.id;
    const projectId = uuidv4();
    const s3Key = `${userId}/${projectId}/raw.${descriptor.extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: descriptor.contentType,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url: presignedUrl,
      key: s3Key,
      projectId: projectId,
      contentType: descriptor.contentType,
    });
  } catch (error: unknown) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
