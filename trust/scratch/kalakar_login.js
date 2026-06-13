const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to app.kalakar.io...');
  await page.goto('https://app.kalakar.io', { waitUntil: 'networkidle' });
  
  try {
      console.log('Filling form...');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.fill('input[type="email"]', 'kothapallitharun77@gmail.com');
      await page.fill('input[type="password"]', 'tharun12344');
      await page.click('button[type="submit"]');
      
      console.log('Clicked login, waiting for navigation...');
      await page.waitForTimeout(10000);
      
      await page.screenshot({ path: 'scratch/kalakar_dashboard.png' });
      
      const state = await context.storageState();
      fs.writeFileSync('scratch/kalakar_state.json', JSON.stringify(state));
      console.log('Saved state successfully!');
  } catch(e) {
      console.log('Error during login:', e.message);
  }
  await browser.close();
})();
