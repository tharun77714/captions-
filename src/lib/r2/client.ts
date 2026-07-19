import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error('R2 credentials are missing in environment variables.');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  // Disable automatic checksum injection — Cloudflare R2 returns 403 on
  // GetObject presigned URLs when x-amz-checksum-mode is included but the
  // object was stored without a checksum (which is the default for uploads).
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'vidyut-media-production';

