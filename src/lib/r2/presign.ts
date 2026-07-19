import { createHmac, createHash } from 'crypto';

/**
 * Manual AWS Signature V4 presigned URL for Cloudflare R2 GetObject.
 *
 * The AWS SDK v3 injects extra headers (x-amz-checksum-mode, amz-sdk-invocation-id,
 * x-amz-user-agent) into the signing process on some runtimes (e.g. Vercel), causing
 * SignatureDoesNotMatch errors from R2. By signing manually we have full control:
 * ONLY the `host` header is signed, which every HTTP client sends automatically.
 */

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate    = hmac('AWS4' + secretKey, dateStamp);
  const kRegion  = hmac(kDate,    region);
  const kService = hmac(kRegion,  service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

export function r2PresignedGetUrl(key: string, expiresInSeconds = 3600): string {
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const accountId       = process.env.R2_ACCOUNT_ID!;
  const bucket          = process.env.R2_BUCKET_NAME || 'vidyut-media-production';

  const host    = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const region  = 'auto';
  const service = 's3';

  const now          = new Date();
  const dateStamp    = now.toISOString().slice(0, 10).replace(/-/g, '');          // YYYYMMDD
  const amzDate      = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); // YYYYMMDDTHHmmssZ
  const encodedKey   = key.split('/').map(encodeURIComponent).join('/');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential      = `${accessKeyId}/${credentialScope}`;

  // Build canonical query string — params MUST be sorted lexicographically
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256':'UNSIGNED-PAYLOAD',
    'X-Amz-Credential':    credential,
    'X-Amz-Date':          amzDate,
    'X-Amz-Expires':       String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
    'x-id':                'GetObject',
  };

  const sortedKeys     = Object.keys(queryParams).sort();
  const canonicalQuery = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  // Canonical request
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders    = 'host';
  const payloadHash      = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'GET',
    `/${encodedKey}`,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature  = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}/${encodedKey}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
