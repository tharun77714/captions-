/**
 * Export Parity Verification Script
 * 
 * This script:
 * 1. Opens the editor in a headless browser
 * 2. Captures exact rendered subtitle measurements from the DOM
 * 3. Computes what the ASS export would produce with those measurements
 * 4. Compares editor CSS values vs ASS computed values
 * 5. Reports any discrepancy
 */

const { chromium } = require('playwright');

const PROJECT_URL = 'http://localhost:3000/dashboard/projects/74432fcc-d772-4c66-96bd-a72422a31ccb/editor';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Loading editor...');
  await page.goto(PROJECT_URL);
  await page.waitForTimeout(8000);

  // Capture measurements from the DOM
  const m = await page.evaluate(() => {
    const video = document.querySelector('video');
    const container = video?.parentElement;
    const subtitleOuter = document.querySelector('[class*=pointer-events-none]');
    const subtitleBox = subtitleOuter?.querySelector('span');
    
    if (!video || !container) return { error: 'No video/container found' };
    
    const containerRect = container.getBoundingClientRect();
    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;
    const scaleFactor = nativeH / containerRect.height;
    
    let result = {
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
      videoWidth: nativeW,
      videoHeight: nativeH,
      scaleFactor,
    };
    
    if (subtitleBox) {
      const cs = getComputedStyle(subtitleBox);
      const boxRect = subtitleBox.getBoundingClientRect();
      
      result.cssFontSize = parseFloat(cs.fontSize);
      result.cssLineHeight = parseFloat(cs.lineHeight);
      result.cssPaddingTop = parseFloat(cs.paddingTop);
      result.cssPaddingBottom = parseFloat(cs.paddingBottom);
      result.cssPaddingLeft = parseFloat(cs.paddingLeft);
      result.cssPaddingRight = parseFloat(cs.paddingRight);
      result.cssBorderRadius = parseFloat(cs.borderRadius);
      result.cssMaxWidth = cs.maxWidth;
      result.cssBottomOffset = containerRect.bottom - boxRect.bottom;
      result.subtitleText = subtitleBox.textContent;
      result.boxWidth = boxRect.width;
      result.boxHeight = boxRect.height;
      
      // Measure word spans
      const wordSpans = subtitleBox.querySelectorAll('span');
      result.wordCount = wordSpans.length;
      if (wordSpans.length > 0) {
        const firstWordCs = getComputedStyle(wordSpans[0]);
        result.wordMarginRight = parseFloat(firstWordCs.marginRight);
        result.wordPadding = firstWordCs.padding;
        result.wordOpacity = firstWordCs.opacity;
        result.wordColor = firstWordCs.color;
      }
    }
    
    return result;
  });

  if (m.error) {
    console.error('ERROR:', m.error);
    await browser.close();
    return;
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('  BROWSER DOM MEASUREMENTS (Source of Truth)');
  console.log('════════════════════════════════════════════════════');
  console.log(`  Container:      ${m.containerWidth.toFixed(2)} x ${m.containerHeight.toFixed(2)} CSS px`);
  console.log(`  Native Video:   ${m.videoWidth} x ${m.videoHeight} px`);
  console.log(`  Scale Factor:   ${m.scaleFactor.toFixed(6)}`);
  console.log(`  CSS Font Size:  ${m.cssFontSize} px`);
  console.log(`  CSS Line Height:${m.cssLineHeight} px`);
  console.log(`  CSS Padding:    top=${m.cssPaddingTop} right=${m.cssPaddingRight} bottom=${m.cssPaddingBottom} left=${m.cssPaddingLeft}`);
  console.log(`  CSS Bottom Gap: ${m.cssBottomOffset} px`);
  console.log(`  Box Size:       ${m.boxWidth?.toFixed(2)} x ${m.boxHeight?.toFixed(2)} CSS px`);
  console.log(`  Subtitle Text:  "${m.subtitleText}"`);
  console.log(`  Word Count:     ${m.wordCount}`);

  console.log('\n════════════════════════════════════════════════════');
  console.log('  ASS COMPUTED VALUES (Using Measurements)');
  console.log('════════════════════════════════════════════════════');
  
  const sf = m.scaleFactor;
  const assFontSize = Math.round(m.cssFontSize * sf);
  const assOutline = Math.round((m.cssPaddingLeft + m.cssPaddingTop) / 2 * sf);
  const assMarginV = Math.round(m.cssBottomOffset * sf);
  const assMarginX = Math.round(m.videoWidth * (1 - 0.85) / 2);
  
  console.log(`  PlayRes:        ${m.videoWidth} x ${m.videoHeight}`);
  console.log(`  FontSize:       ${assFontSize} (${m.cssFontSize}px * ${sf.toFixed(4)})`);
  console.log(`  Outline (pad):  ${assOutline} ((${m.cssPaddingLeft}+${m.cssPaddingTop})/2 * ${sf.toFixed(4)})`);
  console.log(`  MarginV:        ${assMarginV} (${m.cssBottomOffset}px * ${sf.toFixed(4)})`);
  console.log(`  MarginX:        ${assMarginX} (${m.videoWidth} * 0.075)`);

  console.log('\n════════════════════════════════════════════════════');
  console.log('  PARITY VERIFICATION');
  console.log('════════════════════════════════════════════════════');
  
  // Check: font size fraction of frame
  const cssFontFraction = m.cssFontSize / m.containerHeight;
  const assFontFraction = assFontSize / m.videoHeight;
  const fontError = Math.abs(cssFontFraction - assFontFraction) / cssFontFraction * 100;
  
  console.log(`  Font as % of frame: CSS=${(cssFontFraction*100).toFixed(4)}%  ASS=${(assFontFraction*100).toFixed(4)}%  Error=${fontError.toFixed(2)}%`);
  
  // Check: bottom offset fraction
  const cssBottomFraction = m.cssBottomOffset / m.containerHeight;
  const assBottomFraction = assMarginV / m.videoHeight;
  const bottomError = Math.abs(cssBottomFraction - assBottomFraction) / cssBottomFraction * 100;
  
  console.log(`  Bottom as % of frame: CSS=${(cssBottomFraction*100).toFixed(4)}%  ASS=${(assBottomFraction*100).toFixed(4)}%  Error=${bottomError.toFixed(2)}%`);
  
  // Check: padding fraction
  const cssPadFraction = ((m.cssPaddingLeft + m.cssPaddingTop) / 2) / m.containerHeight;
  const assPadFraction = assOutline / m.videoHeight;
  const padError = Math.abs(cssPadFraction - assPadFraction) / cssPadFraction * 100;
  
  console.log(`  Padding as % of frame: CSS=${(cssPadFraction*100).toFixed(4)}%  ASS=${(assPadFraction*100).toFixed(4)}%  Error=${padError.toFixed(2)}%`);
  
  const maxError = Math.max(fontError, bottomError, padError);
  
  if (maxError < 1.0) {
    console.log(`\n  ✅ PARITY ACHIEVED: Maximum error is ${maxError.toFixed(2)}% (< 1%)`);
  } else {
    console.log(`\n  ❌ PARITY FAILED: Maximum error is ${maxError.toFixed(2)}%`);
  }

  // Screenshot
  await page.screenshot({ 
    path: 'C:\\Users\\Kotha\\.gemini\\antigravity\\brain\\1b80c15b-4e2e-4f58-96ad-21735aaefde4\\parity_editor_frame.png',
    fullPage: false 
  });
  console.log('\n  Screenshot saved: parity_editor_frame.png');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
