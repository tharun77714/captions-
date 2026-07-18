const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  
  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:3002/dashboard');
  await page.waitForLoadState('networkidle');

  console.log("Finding first project...");
  const firstProject = page.locator('a[href^="/dashboard/projects/"]').first();
  await firstProject.click();

  console.log("Waiting for editor to load...");
  await page.waitForSelector('video');
  // wait for presets to be visible
  await page.waitForSelector('text=AI Creator Presets', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000); // give it time to render

  const brainDir = path.resolve('C:\\Users\\Kotha\\.gemini\\antigravity\\brain\\f85ce4d8-4569-44e7-8985-2a89fd8127d0');

  console.log("Taking screenshot 1: Original...");
  await page.screenshot({ path: path.join(brainDir, '1_original.png') });

  console.log("Clicking Hormozi preset...");
  await page.click('text=Hormozi');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(brainDir, '2_hormozi.png') });

  console.log("Clicking Ali Abdaal preset...");
  await page.click('text=Ali Abdaal');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(brainDir, '3_ali.png') });

  console.log("Clicking Iman preset...");
  await page.click('text=Iman Gadzhi');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(brainDir, '4_iman.png') });

  // Simulate manual override surviving
  console.log("Testing override survival...");
  // Pressing Undo (Ctrl+Z)
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(brainDir, '5_undo_ali.png') });

  console.log("Done.");
  await browser.close();
})();
