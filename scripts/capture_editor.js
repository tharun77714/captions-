const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactsDir = 'C:\\Users\\Kotha\\.gemini\\antigravity\\brain\\f85ce4d8-4569-44e7-8985-2a89fd8127d0\\scratch';

(async () => {
  console.log("Starting parity capture...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
    const href = await projectLink.getAttribute('href');
    const projectId = href.split('/').pop();
    console.log("Found project link. Navigating to editor...");
    await page.goto('http://localhost:3002/dashboard/projects/' + projectId + '/editor');
    
    // Wait for editor to load completely
    await page.waitForTimeout(5000);
    console.log("Editor loaded.");

    await page.waitForTimeout(2000);

    // Screenshot video player container
    console.log("Taking Editor screenshot...");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'editor_screenshot.png') });

    // Capture measurements payload
    console.log("Triggering export to capture payload...");
    await page.evaluate(() => {
      window.triggerParityExport();
    });
    await page.waitForTimeout(2000);
    
    const payloads = await page.evaluate(() => {
      return window.__PAYLOAD_FOR_TEST__ || null;
    });

    if (payloads) {
      fs.writeFileSync('parity_test_payloads.json', JSON.stringify(payloads, null, 2));
      console.log("Wrote parity_test_payloads.json with fresh measurements!");
    } else {
      console.log("Failed to capture payloads.");
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
