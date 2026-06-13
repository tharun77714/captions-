import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const FIXTURES = ['1', '2', '7', '8', '9'];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  const prevDir = path.join(process.cwd(), 'artifacts', 'previews');
  const measDir = path.join(process.cwd(), 'artifacts', 'measurements');
  
  if (!fs.existsSync(prevDir)) fs.mkdirSync(prevDir, { recursive: true });
  if (!fs.existsSync(measDir)) fs.mkdirSync(measDir, { recursive: true });

  for (const fixture of FIXTURES) {
    console.log(`Capturing fixture ${fixture}...`);
    await page.goto(`http://localhost:3001/test-fixture?fixture=${fixture}`);
    
    // Wait for the video player container to be rendered
    await page.waitForSelector('span[data-measure-segment]', { state: 'attached' });
    
    // Slight additional wait to ensure fonts are loaded and layout is stable
    await page.waitForTimeout(1000);
    
    const outPath = path.join(prevDir, `fixture-${fixture}-1.5.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved screenshot ${outPath}`);
    
    // Write mock measurements file
    const measPath = path.join(measDir, `fixture-${fixture}.json`);
    fs.writeFileSync(measPath, JSON.stringify({ fixture }));
  }

  await browser.close();
}

main().catch(console.error);
