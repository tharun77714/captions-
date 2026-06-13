const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_ID = '74432fcc-d772-4c66-96bd-a72422a31ccb';
const PROJECT_URL = `http://localhost:3000/dashboard/projects/${PROJECT_ID}/editor`;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Loading editor...');
  await page.goto(PROJECT_URL, { waitUntil: 'networkidle' });

  // Wait for video player
  await page.waitForSelector('.video-player', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);

  console.log('Clicking Export...');
  // Find the export button (it has text 'Export Video')
  await page.click('button:has-text("Export")');

  console.log('Waiting for export to complete (this may take a minute)...');
  
  // Wait for the Download button to appear, or check Supabase directly
  // The UI might show a "Download" button when done.
  // Actually, let's just poll the Supabase DB using a direct fetch, or just wait for the UI to change.
  let downloadUrl = null;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(2000);
    const link = await page.evaluate(() => {
        const a = document.querySelector('a[download]');
        return a ? a.href : null;
    });
    if (link) {
        downloadUrl = link;
        break;
    }
  }

  if (!downloadUrl) {
    console.log('Export timeout or failed to find download link in UI. Check Modal logs.');
    await browser.close();
    return;
  }

  console.log(`Download URL: ${downloadUrl}`);
  // Downloading file
  const videoPath = 'tests/export_after_fix.mp4';
  
  await new Promise((resolve) => {
    https.get(downloadUrl, (res) => {
      const file = fs.createWriteStream(videoPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
  });

  console.log('Video downloaded. Extracting frame...');
  
  try {
    execSync(`ffmpeg -y -i ${videoPath} -ss 00:00:19.000 -vframes 1 tests/images/after_fix.png`);
    console.log('Frame extracted to tests/images/after_fix.png');
  } catch (e) {
    console.log('FFmpeg failed', e.message);
  }

  await browser.close();
}

main().catch(console.error);
