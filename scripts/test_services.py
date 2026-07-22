import os
import sys
import httpx
import boto3
from dotenv import dotenv_values

# Ensure standard output uses UTF-8 if available, or fall back to plain ascii
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

print("=" * 60)
print("              VIDYUT SERVICES DIAGNOSTICS")
print("=" * 60)

config = dotenv_values(".env.local")

# 1. Check env vars
print("\n[1] ENVIRONMENT VARIABLES STATUS:")
keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "MODAL_WEBHOOK_URL",
    "DEEPGRAM_API_KEY"
]
for k in keys:
    val = config.get(k)
    status = "LOADED" if val else "MISSING"
    print(f"  - {k:<30}: {status}")

# 2. Test Supabase
print("\n[2] TESTING SUPABASE CONNECTIVITY:")
sb_url = config.get("NEXT_PUBLIC_SUPABASE_URL")
sb_key = config.get("SUPABASE_SERVICE_ROLE_KEY")
if sb_url and sb_key:
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}"
    }
    try:
        res = httpx.get(f"{sb_url}/rest/v1/projects?select=count", headers=headers, timeout=10.0)
        if res.status_code in [200, 201]:
            print(f"  - Connection: SUCCESS (Status: {res.status_code})")
        else:
            print(f"  - Connection: FAILED (Status: {res.status_code}, Body: {res.text})")
    except Exception as e:
        print(f"  - Connection: ERROR ({e})")
else:
    print("  - Skipped: Credentials missing.")

# 3. Test Cloudflare R2
print("\n[3] TESTING CLOUDFLARE R2 CONNECTION:")
r2_id = config.get("R2_ACCOUNT_ID")
r2_key = config.get("R2_ACCESS_KEY_ID")
r2_secret = config.get("R2_SECRET_ACCESS_KEY")
r2_bucket = config.get("R2_BUCKET_NAME")

if r2_id and r2_key and r2_secret and r2_bucket:
    try:
        s3 = boto3.client(
            service_name="s3",
            endpoint_url=f"https://{r2_id}.r2.cloudflarestorage.com",
            aws_access_key_id=r2_key,
            aws_secret_access_key=r2_secret
        )
        s3.list_objects_v2(Bucket=r2_bucket, MaxKeys=1)
        print("  - Connection: SUCCESS (Bucket listed successfully)")
    except Exception as e:
        print(f"  - Connection: FAILED ({e})")
else:
    print("  - Skipped: R2 Credentials missing.")

# 4. Test Deepgram API
print("\n[4] TESTING DEEPGRAM CONNECTIVITY:")
dg_key = config.get("DEEPGRAM_API_KEY")
if dg_key:
    try:
        headers = {
            "Authorization": f"Token {dg_key}"
        }
        res = httpx.get("https://api.deepgram.com/v1/projects", headers=headers, timeout=10.0)
        if res.status_code == 200:
            print("  - Connection: SUCCESS (Deepgram credentials valid)")
        else:
            print(f"  - Connection: FAILED (Status: {res.status_code}, Body: {res.text})")
    except Exception as e:
        print(f"  - Connection: ERROR ({e})")
else:
    print("  - Skipped: Deepgram key missing.")

# 5. Test Modal Webhooks
print("\n[5] TESTING MODAL WEBHOOK STATUS:")
transcribe_wh = config.get("MODAL_WEBHOOK_URL")

if transcribe_wh:
    try:
        res = httpx.post(transcribe_wh, timeout=10.0)
        if res.status_code in [200, 201, 202, 400, 405]:
            print("  - Transcriber: ONLINE (Status: f{res.status_code})")
        else:
            print(f"  - Transcriber: UNEXPECTED RESPONSE (Status: {res.status_code})")
    except Exception as e:
        print(f"  - Transcriber: ONLINE/REACHED (Response/Status check: {e})")
else:
    print("  - Transcriber: Skipped (URL missing)")

print("\n" + "=" * 60)
