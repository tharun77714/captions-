/**
 * KALAKAR TEMPLATE EXTRACTION
 * 
 * Clicks through every template in the Kalakaar editor sidebar
 * and captures the exact computed CSS properties of the subtitle overlay.
 * 
 * Output: parity/reports/kalakar_template_styles.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEMPLATE_NAMES = [
  'Kalakar Glow', 'Ali Abdaal', 'Kalakar Shadow', 'Kalakar',
  'Clean Motion', 'Double Trouble', 'Bubble Style', 'Hormozi Style',
  'Editing Skool', 'Mr Beast Style 1', 'Mr Beast Style 2', 'Iman Gadzhi',
  'Devin Jatho', 'Highlighted Word', 'Clean Glow Style', 'Kalakar Clean',
  'Black Punch', 'Kalakar Word', 'Pixelated Word', 'Ziada',
  'Liquid Glass', 'Top Up', 'Mota', 'Tabahi',
  'Deep Glow', 'Seedha Saadha', 'Thora Cinematic', 'Delhi', 'Zero Gravity'
];

async function extractSubtitleStyles(page) {
  return await page.evaluate(() => {
    // Find the subtitle container overlaying the video
    // Kalakaar renders words as individual spans inside a container
    const allSpans = document.querySelectorAll('span');
    const wordSpans = [];
    
    for (const span of allSpans) {
      const cs = getComputedStyle(span);
      const text = span.textContent?.trim();
      // Look for spans that are positioned over the video area
      // and have visible text styling (not UI elements)
      if (text && text.length > 0 && text.length < 30) {
        const rect = span.getBoundingClientRect();
        // Must be in the video area (roughly center of screen)
        if (rect.top > 100 && rect.left > 50 && rect.width > 5) {
          wordSpans.push({
            text: text,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            styles: {
              fontFamily: cs.fontFamily,
              fontSize: cs.fontSize,
              fontWeight: cs.fontWeight,
              fontStyle: cs.fontStyle,
              color: cs.color,
              backgroundColor: cs.backgroundColor,
              textShadow: cs.textShadow,
              textDecoration: cs.textDecoration,
              textTransform: cs.textTransform,
              letterSpacing: cs.letterSpacing,
              wordSpacing: cs.wordSpacing,
              lineHeight: cs.lineHeight,
              webkitTextStroke: cs.webkitTextStroke || cs['-webkit-text-stroke'] || 'none',
              opacity: cs.opacity,
              transform: cs.transform,
              padding: cs.padding,
              borderRadius: cs.borderRadius,
              filter: cs.filter,
            }
          });
        }
      }
    }

    // Also try to find the container element
    const containers = document.querySelectorAll('div');
    let containerStyle = null;
    for (const div of containers) {
      const cs = getComputedStyle(div);
      // Look for the subtitle container (has background, positioned absolute)
      if (cs.position === 'absolute' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
        const rect = div.getBoundingClientRect();
        if (rect.top > 100 && rect.height < 200 && rect.width > 50) {
          containerStyle = {
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            backgroundColor: cs.backgroundColor,
            padding: cs.padding,
            paddingLeft: cs.paddingLeft,
            paddingRight: cs.paddingRight,
            paddingTop: cs.paddingTop,
            paddingBottom: cs.paddingBottom,
            borderRadius: cs.borderRadius,
            boxShadow: cs.boxShadow,
          };
          break;
        }
      }
    }

    return { wordSpans, containerStyle };
  });
}

(async () => {
  const outputDir = path.resolve('parity/reports');
  const screenshotDir = path.resolve('parity/screenshots');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'scratch/kalakar_state.json',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Navigating to Kalakaar editor...');
  await page.goto('https://app.kalakar.io/recent', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click on the project
  try {
    await page.click('text="Welcome to Kalakar"', { timeout: 10000 });
  } catch {
    console.log('Could not find project, trying first card...');
    await page.click('.cursor-pointer >> nth=0', { timeout: 10000 });
  }
  await page.waitForTimeout(5000);

  // Click the Templates tab first
  console.log('Clicking Templates tab...');
  try {
    await page.click('button:has-text("Templates")', { timeout: 5000 });
  } catch {
    // Try role-based
    await page.click('[role="tab"]:has-text("Templates")', { timeout: 5000 });
  }
  await page.waitForTimeout(2000);

  const results = {};
  let extractionCount = 0;

  for (const templateName of TEMPLATE_NAMES) {
    console.log(`\n──── Extracting: ${templateName} ────`);
    
    try {
      // Click the template button in the sidebar
      // Templates appear as clickable items with their names
      const templateSelector = `text="${templateName}"`;
      
      // Try clicking
      const clicked = await page.click(templateSelector, { timeout: 3000 }).catch(() => null);
      
      if (clicked === null) {
        // Try partial match
        const partialSelector = `*:has-text("${templateName}")`;
        await page.click(partialSelector, { timeout: 3000 }).catch(() => {
          console.log(`  ⚠ Could not click template: ${templateName}`);
        });
      }
      
      // Wait for style to apply
      await page.waitForTimeout(1500);
      
      // Take screenshot
      const screenshotPath = path.join(screenshotDir, `template_${templateName.replace(/\s+/g, '_').toLowerCase()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      // Extract computed styles
      const styles = await extractSubtitleStyles(page);
      
      results[templateName] = {
        name: templateName,
        extracted: new Date().toISOString(),
        screenshot: screenshotPath,
        wordSpans: styles.wordSpans,
        containerStyle: styles.containerStyle,
        wordCount: styles.wordSpans.length,
      };
      
      extractionCount++;
      console.log(`  ✓ Extracted ${styles.wordSpans.length} word spans`);
      
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message}`);
      results[templateName] = {
        name: templateName,
        error: e.message,
        extracted: new Date().toISOString(),
      };
    }
  }

  // Also extract the right sidebar's style controls state
  console.log('\n──── Extracting Style Panel State ────');
  const stylePanelState = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const sliders = inputs.filter(i => i.type === 'range' || i.getAttribute('role') === 'slider');
    const textInputs = inputs.filter(i => i.type === 'text');
    const selects = Array.from(document.querySelectorAll('select'));
    const switches = Array.from(document.querySelectorAll('[role="switch"]'));
    
    return {
      sliders: sliders.map(s => ({
        label: s.getAttribute('aria-label') || s.id || '',
        min: s.getAttribute('aria-valuemin') || s.min,
        max: s.getAttribute('aria-valuemax') || s.max,
        current: s.getAttribute('aria-valuenow') || s.value,
      })),
      textInputs: textInputs.map(t => ({
        label: t.getAttribute('aria-label') || t.placeholder || '',
        value: t.value,
      })),
      selects: selects.map(s => ({
        value: s.value,
        options: Array.from(s.options).map(o => o.textContent),
      })),
      switches: switches.map(s => ({
        label: s.getAttribute('aria-label') || '',
        checked: s.getAttribute('aria-checked'),
        state: s.getAttribute('data-state'),
      })),
    };
  });

  results['__style_panel_state__'] = stylePanelState;

  // Write full report
  const outputPath = path.join(outputDir, 'kalakar_template_styles.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`Templates extracted: ${extractionCount}/${TEMPLATE_NAMES.length}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Screenshots: ${screenshotDir}`);
  console.log(`═══════════════════════════════════════════`);

  await browser.close();
})();
