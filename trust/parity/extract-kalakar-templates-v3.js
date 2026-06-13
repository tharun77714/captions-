/**
 * KALAKAR TEMPLATE EXTRACTION V3
 * 
 * Fix: Navigate INTO the editor (not just the project list page).
 * The templates tab is only available inside the editor.
 * 
 * Strategy:
 * 1. Go to app.kalakar.io/recent
 * 2. Click a project card to enter the editor  
 * 3. Wait for the editor to load (look for video element + sidebar)
 * 4. Click Templates tab
 * 5. For each template: click it, switch to Text tab to read style values, screenshot
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

async function readAllSliders(page) {
  return await page.evaluate(() => {
    const result = {};
    // Get all slider inputs (range inputs and aria-role sliders)
    const sliders = document.querySelectorAll('input[role="slider"], input[type="range"], [role="slider"]');
    for (const s of sliders) {
      const label = s.getAttribute('aria-label') || s.id || '';
      const val = s.getAttribute('aria-valuenow') || s.value || '';
      const min = s.getAttribute('aria-valuemin') || s.min || '';
      const max = s.getAttribute('aria-valuemax') || s.max || '';
      if (label) {
        result[label] = { value: val, min, max };
      }
    }
    // Get all toggle switches
    const switches = document.querySelectorAll('[role="switch"]');
    const switchResults = [];
    for (const sw of switches) {
      const state = sw.getAttribute('data-state');
      const parent = sw.closest('div.flex, div.space-y-4');
      const nearLabel = parent?.querySelector('label')?.textContent?.trim() || 'unknown';
      switchResults.push({ label: nearLabel, state });
    }
    result['__switches__'] = switchResults;
    return result;
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

  // ─── Step 1: Navigate to project list ──────────────────────────────
  console.log('Step 1: Navigating to project list...');
  await page.goto('https://app.kalakar.io/recent', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // ─── Step 2: Enter a project ───────────────────────────────────────
  console.log('Step 2: Entering a project...');
  // Look for project cards — they usually have thumbnails/titles
  // Click the first project
  const projectLinks = await page.locator('a[href*="/editor/"], a[href*="/project/"]').all();
  if (projectLinks.length > 0) {
    console.log(`  Found ${projectLinks.length} project links`);
    await projectLinks[0].click();
  } else {
    // Try clicking any card-like element
    console.log('  No project links found, trying click on card elements...');
    // The page shows project thumbnails, try clicking the first visible one
    await page.locator('img').first().click({ timeout: 5000 }).catch(() => {});
    // Or try the first meaningful clickable area
    await page.locator('[class*="card"], [class*="project"], [class*="thumbnail"]').first().click({ timeout: 5000 }).catch(() => {});
  }
  
  // Wait for editor to load
  console.log('  Waiting for editor to load...');
  await page.waitForTimeout(8000);

  // Take diagnostic screenshot
  await page.screenshot({ path: path.join(screenshotDir, 'editor_loaded.png') });
  console.log(`  Current URL: ${page.url()}`);

  // Check if we're in the editor (should have video element or canvas)
  const hasVideo = await page.locator('video').count();
  const hasCanvas = await page.locator('canvas').count();
  console.log(`  Video elements: ${hasVideo}, Canvas elements: ${hasCanvas}`);

  // ─── Step 3: Find and click the Templates tab ─────────────────────
  console.log('\nStep 3: Finding Templates tab...');
  
  // Dump all button texts to find the right tab
  const allButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim().substring(0, 50),
      class: b.className?.toString().substring(0, 80),
      visible: b.offsetParent !== null,
    })).filter(b => b.visible && b.text);
  });
  
  console.log('  Visible buttons:');
  for (const btn of allButtons.slice(0, 30)) {
    console.log(`    "${btn.text}"`);
  }

  // Click Templates
  let templatesFound = false;
  for (const search of ['Templates', 'templates', 'TEMPLATES']) {
    try {
      await page.click(`button:has-text("${search}")`, { timeout: 3000 });
      templatesFound = true;
      console.log(`  ✓ Clicked "${search}" tab`);
      break;
    } catch {}
  }

  if (!templatesFound) {
    // Try tab role
    try {
      await page.click('[role="tab"]:has-text("Template")', { timeout: 3000 });
      templatesFound = true;
    } catch {}
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'templates_tab.png') });

  // ─── Step 4: Extract template names visible in the sidebar ─────────
  console.log('\nStep 4: Reading available templates...');
  const visibleTemplates = await page.evaluate(() => {
    // Look for template items — they could be buttons, divs, or list items with template names
    const items = [];
    const allEls = document.querySelectorAll('button, div, span, p');
    const templateNamePattern = /^(Kalakar|Ali|Clean|Double|Bubble|Hormozi|Editing|Mr Beast|Iman|Devin|Highlighted|Black|Pixelated|Ziada|Liquid|Top Up|Mota|Tabahi|Deep|Seedha|Thora|Delhi|Zero)/i;
    
    for (const el of allEls) {
      const text = el.textContent?.trim();
      if (text && text.length > 3 && text.length < 50 && templateNamePattern.test(text)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 5 && rect.x > 0) {
          items.push({
            text,
            tag: el.tagName,
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            clickable: el.tagName === 'BUTTON' || el.closest('button') !== null || getComputedStyle(el).cursor === 'pointer',
          });
        }
      }
    }
    return items;
  });

  console.log(`  Found ${visibleTemplates.length} template-like elements:`);
  const seen = new Set();
  for (const t of visibleTemplates) {
    if (!seen.has(t.text)) {
      seen.add(t.text);
      console.log(`    ${t.clickable ? '🔘' : '  '} "${t.text}" (${t.tag}) @ x=${t.rect.x} y=${t.rect.y}`);
    }
  }

  // ─── Step 5: For each template, click it and extract style panel ───
  console.log('\nStep 5: Extracting template styles...');
  const results = {};

  // Get unique clickable template names
  const uniqueTemplates = [...new Set(visibleTemplates.filter(t => t.clickable).map(t => t.text))];
  
  // Also try the predefined list
  const allTemplatesToTry = [...new Set([...uniqueTemplates, ...TEMPLATE_NAMES])];

  for (const templateName of allTemplatesToTry) {
    console.log(`\n  ──── ${templateName} ────`);

    try {
      // Try to click the template by text
      const clickTarget = page.locator(`button:has-text("${templateName}"), [class*="cursor-pointer"]:has-text("${templateName}")`).first();
      const exists = await clickTarget.count();

      if (exists === 0) {
        // Try scrolling the sidebar to find it
        const scrollContainer = page.locator('[class*="overflow-y-auto"], [class*="scrollbar"]').first();
        if (await scrollContainer.count() > 0) {
          await scrollContainer.evaluate(el => el.scrollTop += 200);
          await page.waitForTimeout(300);
        }

        const retryTarget = page.locator(`*:has-text("${templateName}")`).first();
        if (await retryTarget.count() === 0) {
          console.log(`    ⚠ Not found`);
          continue;
        }
        await retryTarget.click({ timeout: 2000 });
      } else {
        await clickTarget.scrollIntoViewIfNeeded();
        await clickTarget.click({ timeout: 3000 });
      }

      await page.waitForTimeout(1500);

      // Switch to Text tab to read style values
      try {
        await page.click('button:has-text("Text")', { timeout: 2000 });
        await page.waitForTimeout(800);
      } catch {}

      // Read all slider values
      const sliders = await readAllSliders(page);

      // Read subtitle overlay appearance
      const overlayInfo = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (!video) return null;
        const vRect = video.getBoundingClientRect();

        // Find text elements overlaying the video
        const overlays = [];
        for (const el of document.querySelectorAll('span, div, p')) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const fontSize = parseFloat(cs.fontSize);

          // Must overlay video, have meaningful size
          if (r.x >= vRect.x - 10 && r.right <= vRect.right + 10 &&
              r.y >= vRect.y && r.bottom <= vRect.bottom + 10 &&
              fontSize >= 14 && el.children.length <= 3) {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              overlays.push({
                text: text.substring(0, 40),
                fontSize: cs.fontSize,
                fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(),
                fontWeight: cs.fontWeight,
                color: cs.color,
                backgroundColor: cs.backgroundColor,
                textShadow: cs.textShadow !== 'none' ? cs.textShadow : null,
                webkitTextStroke: cs.webkitTextStroke || null,
                textTransform: cs.textTransform,
                letterSpacing: cs.letterSpacing,
                opacity: cs.opacity,
                padding: cs.padding,
                borderRadius: cs.borderRadius,
              });
            }
          }
        }
        return overlays;
      });

      // Screenshot
      const ssFile = `tmpl_${templateName.replace(/[\s\/]+/g, '_').toLowerCase()}.png`;
      await page.screenshot({ path: path.join(screenshotDir, ssFile) });

      // Switch back to Templates tab
      try {
        await page.click('button:has-text("Templates")', { timeout: 2000 });
        await page.waitForTimeout(500);
      } catch {}

      results[templateName] = {
        name: templateName,
        sliders,
        overlayInfo,
        screenshot: ssFile,
      };

      console.log(`    ✓ Sliders: ${Object.keys(sliders).filter(k => k !== '__switches__').length}`);
      console.log(`    ✓ Overlays: ${overlayInfo?.length || 0}`);
      if (overlayInfo?.[0]) {
        const o = overlayInfo[0];
        console.log(`    ✓ Style: ${o.fontFamily} ${o.fontSize} w${o.fontWeight} ${o.color}`);
      }

    } catch (e) {
      console.log(`    ✗ ${e.message?.substring(0, 80)}`);
      results[templateName] = { error: e.message };
    }
  }

  // Write results
  const outPath = path.join(outputDir, 'kalakar_template_styles_v3.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  const successCount = Object.values(results).filter(r => !r.error).length;
  console.log(`\n═══ EXTRACTION COMPLETE ═══`);
  console.log(`Successful: ${successCount}/${allTemplatesToTry.length}`);
  console.log(`Output: ${outPath}`);

  await browser.close();
})();
