const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'scratch/kalakar_state.json' });
  const page = await context.newPage();
  
  console.log('Navigating to recent...');
  await page.goto('https://app.kalakar.io/recent', { waitUntil: 'networkidle' });
  
  console.log('Clicking on project...');
  await page.click('text="Welcome to Kalakar"');
  
  console.log('Waiting for editor to load...');
  await page.waitForTimeout(10000);
  
  await page.screenshot({ path: 'scratch/kalakar_editor.png' });
  fs.writeFileSync('scratch/kalakar_editor.html', await page.content());
  
  console.log('Done!');
  await browser.close();
})();
