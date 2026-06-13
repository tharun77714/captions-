/**
 * KALAKAR TEMPLATE EXTRACTION V2
 * 
 * The previous extraction captured sidebar UI text, not subtitle overlay text.
 * Kalakaar renders subtitles either via:
 *   1. A canvas element
 *   2. React internal state exposed to window/store
 *   3. Hidden DOM elements for the preview
 *
 * Strategy: For each template, read the React state/store to get the actual
 * style configuration. Also extract from the style panel sliders/inputs.
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

async function extractStylePanelState(page) {
  return await page.evaluate(() => {
    const result = {};

    // 1. Extract all labeled slider controls
    const sliderInputs = document.querySelectorAll('[role="slider"]');
    for (const slider of sliderInputs) {
      const label = slider.getAttribute('aria-label') || slider.id || '';
      if (label) {
        result[label.toLowerCase().replace(/\s+/g, '_')] = {
          value: parseFloat(slider.getAttribute('aria-valuenow') || slider.value || '0'),
          min: parseFloat(slider.getAttribute('aria-valuemin') || '0'),
          max: parseFloat(slider.getAttribute('aria-valuemax') || '100'),
        };
      }
    }

    // 2. Extract toggle switches (stroke, background)
    const switches = document.querySelectorAll('[role="switch"]');
    for (const sw of switches) {
      // Find nearest label
      const parent = sw.closest('.space-y-4, .flex');
      const labelEl = parent?.querySelector('label');
      const label = labelEl?.textContent?.trim() || '';
      if (label) {
        result[label.toLowerCase().replace(/\s+/g, '_') + '_enabled'] = sw.getAttribute('data-state') === 'checked';
      }
    }

    // 3. Extract color picker buttons
    const colorBtns = document.querySelectorAll('button[style*="background"]');
    for (const btn of colorBtns) {
      const bg = btn.style.backgroundColor || getComputedStyle(btn).backgroundColor;
      const label = btn.getAttribute('aria-label') || '';
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        // Find what section this color button is in
        const section = btn.closest('.space-y-4, .space-y-2');
        const sectionLabel = section?.querySelector('label')?.textContent?.trim() || label || 'unknown';
        result[sectionLabel.toLowerCase().replace(/\s+/g, '_') + '_color'] = bg;
      }
    }

    // 4. Extract font selector
    const fontSelects = document.querySelectorAll('select, [role="combobox"]');
    for (const sel of fontSelects) {
      const label = sel.getAttribute('aria-label') || '';
      const value = sel.value || sel.textContent?.trim() || '';
      if (value) {
        result['font_' + (label || 'selector')] = value;
      }
    }

    // 5. Try to find font name displayed in the sidebar
    const allTexts = document.querySelectorAll('span, p, div');
    for (const el of allTexts) {
      const text = el.textContent?.trim();
      if (text && /^(Inter|Montserrat|Poppins|Roboto|Oswald|Bebas|Playfair|Open Sans|Lato|Raleway)/i.test(text)) {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.fontSize) < 20) { // UI element, not subtitle
          result['detected_font'] = text;
          break;
        }
      }
    }

    // 6. Look for the actual subtitle canvas or special containers
    const canvases = document.querySelectorAll('canvas');
    result['canvas_count'] = canvases.length;

    // 7. Try to find React fiber/store
    const rootEl = document.getElementById('__next') || document.getElementById('root');
    if (rootEl && rootEl._reactRootContainer) {
      result['react_root_found'] = true;
    }

    // 8. Check for any global store
    if (typeof window !== 'undefined') {
      // Check for zustand/jotai/recoil stores
      result['has_zustand'] = !!window.__ZUSTAND_DEVTOOLS__;
      result['has_redux'] = !!window.__REDUX_DEVTOOLS_EXTENSION__;
    }

    return result;
  });
}

async function extractSubtitleDOMElements(page) {
  // Find elements that are specifically in the video area / subtitle overlay
  return await page.evaluate(() => {
    // Look for the video element first
    const video = document.querySelector('video');
    if (!video) return { error: 'No video element found' };

    const videoRect = video.getBoundingClientRect();
    
    // Find all absolutely/fixed positioned elements that overlap the video
    const overlayElements = [];
    const allEls = document.querySelectorAll('*');
    
    for (const el of allEls) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      
      // Must be positioned over the video
      if (rect.top >= videoRect.top && rect.bottom <= videoRect.bottom + 50 &&
          rect.left >= videoRect.left && rect.right <= videoRect.right + 50) {
        
        // Must have visible text
        const text = el.textContent?.trim();
        if (!text || text.length === 0 || text.length > 200) continue;
        
        // Must be a leaf node (or close to it) - no more than 3 children
        if (el.children.length > 5) continue;
        
        // Must have meaningful font size (not tiny UI elements)
        const fontSize = parseFloat(cs.fontSize);
        if (fontSize < 14 || fontSize > 100) continue;
        
        overlayElements.push({
          tag: el.tagName,
          text: text.substring(0, 80),
          className: el.className?.toString().substring(0, 100) || '',
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          styles: {
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle,
            color: cs.color,
            backgroundColor: cs.backgroundColor,
            textShadow: cs.textShadow,
            webkitTextStroke: cs.webkitTextStroke || '',
            textTransform: cs.textTransform,
            letterSpacing: cs.letterSpacing,
            lineHeight: cs.lineHeight,
            opacity: cs.opacity,
            padding: cs.padding,
            borderRadius: cs.borderRadius,
            position: cs.position,
            zIndex: cs.zIndex,
          }
        });
      }
    }

    return {
      videoRect: { x: Math.round(videoRect.x), y: Math.round(videoRect.y), w: Math.round(videoRect.width), h: Math.round(videoRect.height) },
      overlayCount: overlayElements.length,
      overlays: overlayElements,
    };
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

  console.log('Navigating to Kalakaar...');
  await page.goto('https://app.kalakar.io/recent', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on a project
  try {
    await page.click('[class*="cursor-pointer"] >> nth=0', { timeout: 10000 });
  } catch {
    const cards = await page.locator('[class*="cursor"]').all();
    if (cards.length > 0) await cards[0].click();
  }
  await page.waitForTimeout(5000);

  // Take a baseline screenshot of the editor
  await page.screenshot({ path: path.join(screenshotDir, 'editor_baseline.png') });

  // First, extract what's on screen before clicking any template
  console.log('\n──── Baseline extraction ────');
  const baselineDom = await extractSubtitleDOMElements(page);
  console.log(`  Video: ${JSON.stringify(baselineDom.videoRect)}`);
  console.log(`  Overlays found: ${baselineDom.overlayCount}`);
  if (baselineDom.overlays?.length > 0) {
    for (const o of baselineDom.overlays.slice(0, 5)) {
      console.log(`    "${o.text}" @ ${JSON.stringify(o.rect)} | font=${o.styles.fontSize} ${o.styles.fontWeight} color=${o.styles.color}`);
    }
  }

  const baselinePanel = await extractStylePanelState(page);
  console.log(`  Panel state: ${JSON.stringify(baselinePanel, null, 2).substring(0, 500)}`);

  // Now click Templates tab
  console.log('\n──── Switching to Templates tab ────');
  try {
    // Kalakaar uses tab-like buttons: Text, Templates, Transitions, AI Audio
    await page.click('button:has-text("Templates")', { timeout: 5000 });
  } catch {
    // Try finding tabs by looking for the tab strip
    const tabs = await page.locator('button').filter({ hasText: /^Templates$/i }).all();
    if (tabs.length > 0) await tabs[0].click();
  }
  await page.waitForTimeout(2000);

  const results = {};

  for (const templateName of TEMPLATE_NAMES) {
    console.log(`\n──── ${templateName} ────`);

    try {
      // Click the template
      // Templates might be inside scrollable container, look for exact text match
      const templateBtn = page.locator(`text="${templateName}"`).first();
      const exists = await templateBtn.count();
      
      if (exists > 0) {
        await templateBtn.scrollIntoViewIfNeeded();
        await templateBtn.click({ timeout: 3000 });
      } else {
        // Try partial match
        const partial = page.locator(`*:has-text("${templateName}")`).first();
        if (await partial.count() > 0) {
          await partial.click({ timeout: 3000 });
        } else {
          console.log(`  ⚠ Template not found in sidebar`);
          results[templateName] = { error: 'Not found in sidebar' };
          continue;
        }
      }

      await page.waitForTimeout(2000);

      // Switch to Text tab to read the style values
      try {
        await page.click('button:has-text("Text")', { timeout: 2000 });
      } catch {}
      await page.waitForTimeout(500);

      // Extract style panel state (this has the actual style values!)
      const panelState = await extractStylePanelState(page);

      // Extract subtitle DOM overlay
      const domState = await extractSubtitleDOMElements(page);

      // Take screenshot
      const ssPath = path.join(screenshotDir, `tmpl_${templateName.replace(/\s+/g, '_').toLowerCase()}.png`);
      await page.screenshot({ path: ssPath });

      // Switch back to Templates tab for next iteration
      try {
        await page.click('button:has-text("Templates")', { timeout: 2000 });
      } catch {}
      await page.waitForTimeout(500);

      // Find the primary subtitle text element
      const primaryOverlay = domState.overlays?.find(o => 
        o.styles.fontSize && parseFloat(o.styles.fontSize) > 16
      );

      results[templateName] = {
        name: templateName,
        extracted: new Date().toISOString(),
        panelControls: panelState,
        subtitleOverlay: primaryOverlay || null,
        allOverlays: domState.overlays?.length || 0,
        screenshot: ssPath,
      };

      console.log(`  ✓ Panel: ${Object.keys(panelState).length} controls`);
      if (primaryOverlay) {
        console.log(`  ✓ Subtitle: font=${primaryOverlay.styles.fontSize} weight=${primaryOverlay.styles.fontWeight} color=${primaryOverlay.styles.color}`);
      }
      console.log(`  ✓ Overlays: ${domState.overlays?.length || 0}`);

    } catch (e) {
      console.log(`  ✗ ${e.message}`);
      results[templateName] = { error: e.message };
    }
  }

  // Write results
  const outPath = path.join(outputDir, 'kalakar_template_styles_v2.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\n═══ EXTRACTION COMPLETE ═══`);
  console.log(`Templates: ${Object.keys(results).filter(k => !results[k].error).length}/${TEMPLATE_NAMES.length}`);
  console.log(`Output: ${outPath}`);

  await browser.close();
})();
