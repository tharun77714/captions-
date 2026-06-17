import { chromium } from 'playwright';
import * as fs from 'fs';

async function main() {
  const payloads = JSON.parse(fs.readFileSync('parity_test_payloads.json', 'utf8'));
  const browser = await chromium.launch();
  
  for (const p of payloads) {
    const rawId = p.project_id; // e.g. "1_telugu"
    const id = rawId.split('_')[0]; // "1"
    
    // Create isolated context with strict viewport matching the user's measured container
    const measurements = p.measurements;
    const width = Math.round(measurements.containerWidth) || 362;
    const height = Math.round(measurements.containerHeight) || 644;

    const context = await browser.newContext({
      viewport: { width, height }
    });
    const page = await context.newPage();
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    
    console.log(`Navigating to test scenario ${rawId} (Viewport: ${width}x${height})...`);
    await page.goto(`http://localhost:3002/test-parity?id=${id}`);
    
    // Wait for the ready status
    await page.waitForSelector('#capture-status[data-status="ready"]', { timeout: 10000 });
    
    // Give fonts and transitions a moment to settle
    await page.waitForTimeout(1000); 
    
    const screenshotPath = `${rawId}_preview.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved ${screenshotPath}`);
    
    await context.close();
  }
  
  await browser.close();
}

main().catch(console.error);
