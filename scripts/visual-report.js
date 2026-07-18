const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactsDir = 'C:\\Users\\Kotha\\.gemini\\antigravity\\brain\\f85ce4d8-4569-44e7-8985-2a89fd8127d0\\scratch';

(async () => {
  console.log("Starting visual validation...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  try {
    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:3002/dashboard');
    
    const projectLink = page.locator('a[href^="/dashboard/projects/"]').first();
    await projectLink.waitFor();
    console.log("Found project link. Navigating to editor...");
    await projectLink.click();
    
    // Wait for editor to load
    await page.waitForTimeout(5000);
    console.log("Editor loaded.");

    // Just use DOM interaction to avoid relying on window.useEditorStore
    const styleBtn = page.locator('button:has-text("Style")');
    await styleBtn.click();
    await page.waitForTimeout(1000);

    console.log("Taking Original screenshot...");
    await page.screenshot({ path: path.join(artifactsDir, 'original.png') });

    console.log("Applying Hormozi...");
    await page.click('button:has-text("Hormozi")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'hormozi.png') });

    console.log("Applying Ali...");
    await page.click('button:has-text("Ali")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'ali.png') });

    console.log("Applying Iman...");
    await page.click('button:has-text("Iman")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'iman.png') });

    console.log("Export Parity...");
    const exportBtn = page.locator('button:has-text("Export")');
    await exportBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'export_parity.png') });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
