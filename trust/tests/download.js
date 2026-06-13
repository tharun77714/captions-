require('dotenv').config({ path: '.env.local' });
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function download() {
    const { data } = await supabase.from('projects').select('export_url').eq('id', '74432fcc-d772-4c66-96bd-a72422a31ccb').single();
    if (data && data.export_url) {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: data.export_url,
        });
        const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
        console.log('Downloading from:', url);
        
        const file = fs.createWriteStream('tests/export_after_fix.mp4');
        https.get(url, (res) => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Downloaded tests/export_after_fix.mp4');
            });
        });
    } else {
        console.log('No export_url found', data);
    }
}
download();
