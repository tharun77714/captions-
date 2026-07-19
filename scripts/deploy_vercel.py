import subprocess
from dotenv import dotenv_values

print("=== LINKING PROJECT TO VERCEL ===")
res = subprocess.run("npx vercel link --yes", capture_output=True, text=True, shell=True)
print(res.stdout)
print(res.stderr)

print("=== LOADING LOCAL ENV VARIABLES ===")
config = dotenv_values(".env.local")

print("=== UPLOADING ENV VARIABLES TO VERCEL ===")
for k, v in config.items():
    if not v:
        continue
    print(f"Adding {k}...")
    # Target production,preview only (excluding development to allow sensitive variables)
    cmd = f'npx vercel env add "{k}" production,preview --value "{v}" --yes --force'
    res = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    if res.returncode == 0:
        print(f"  - {k}: SUCCESS")
    else:
        print(f"  - {k}: FAILED")
        print(res.stdout)
        print(res.stderr)

print("=== TRIGGERING DEPLOYMENT ===")
# Note: npx vercel deploy outputs build status in real time to stderr
res = subprocess.run("npx vercel deploy --prod --yes", capture_output=True, text=True, shell=True)
print(res.stdout)
print(res.stderr)
