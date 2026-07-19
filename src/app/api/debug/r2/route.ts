import { NextResponse } from 'next/server';

export async function GET() {
  const accountId = process.env.R2_ACCOUNT_ID || 'MISSING';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'MISSING';
  const secretKey = process.env.R2_SECRET_ACCESS_KEY || 'MISSING';
  const bucket = process.env.R2_BUCKET_NAME || 'MISSING';

  return NextResponse.json({
    accountId,
    accessKeyId,
    secretKeyFirst8: secretKey.substring(0, 8),
    secretKeyLast4: secretKey.substring(secretKey.length - 4),
    secretKeyLength: secretKey.length,
    bucket,
  });
}
