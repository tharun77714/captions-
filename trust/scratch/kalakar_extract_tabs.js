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
  await page.waitForTimeout(5000);
  
  try {
      console.log('Clicking Templates tab...');
      await page.click('button:has-text("Templates"), [role="tab"]:has-text("Templates")');
      await page.waitForTimeout(2000);
      fs.writeFileSync('scratch/kalakar_templates.html', await page.content());
      
      console.log('Clicking Transitions tab...');
      await page.click('button:has-text("Transitions"), [role="tab"]:has-text("Transitions")');
      await page.waitForTimeout(2000);
      fs.writeFileSync('scratch/kalakar_transitions.html', await page.content());
      
      console.log('Clicking AI Audio tab...');
      await page.click('button:has-text("AI Audio"), [role="tab"]:has-text("AI Audio")');
      await page.waitForTimeout(2000);
      fs.writeFileSync('scratch/kalakar_audio.html', await page.content());
      
      console.log('Clicking Export button...');
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(2000);
      fs.writeFileSync('scratch/kalakar_export_modal.html', await page.content());
      
      console.log('Extraction complete.');
  } catch(e) {
      console.log('Error during extraction:', e.message);
  }
  await browser.close();
})();
