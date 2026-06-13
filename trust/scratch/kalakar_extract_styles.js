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
  
  // Extract canvas styles and dimensions
  const styles = await page.evaluate(() => {
    const findSubtitleNode = (root) => {
        // Find the node with the text we know exists or find a node that has typical subtitle classes
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while(node = walker.nextNode()) {
            if(node.nodeValue.trim() !== '') {
               // Find closest block level parent that's probably the subtitle container
               const parent = node.parentElement;
               // Heuristic: absolute positioning, inside a video wrapper
               const absoluteParent = parent.closest('[style*="position: absolute"], [class*="absolute"]');
               if(absoluteParent) return absoluteParent;
            }
        }
        return null;
    };
    
    // Search for video container
    const video = document.querySelector('video');
    const container = video ? video.parentElement : document.body;
    
    const subContainer = findSubtitleNode(container);
    if(!subContainer) return { error: 'Subtitle container not found' };
    
    const computed = window.getComputedStyle(subContainer);
    const box = subContainer.getBoundingClientRect();
    
    // Also look for specific CSS variables
    const cssVars = Array.from(computed).filter(p => p.startsWith('--')).map(p => ({ [p]: computed.getPropertyValue(p) }));
    
    return {
        text: subContainer.innerText,
        box: box,
        css: {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            lineHeight: computed.lineHeight,
            padding: computed.padding,
            margin: computed.margin,
            width: computed.width,
            height: computed.height,
            transform: computed.transform,
            textShadow: computed.textShadow,
            WebkitTextStroke: computed.WebkitTextStroke,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            boxSizing: computed.boxSizing,
            display: computed.display,
            flexDirection: computed.flexDirection,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            textAlign: computed.textAlign,
            letterSpacing: computed.letterSpacing,
            wordSpacing: computed.wordSpacing,
            whiteSpace: computed.whiteSpace,
            wordBreak: computed.wordBreak
        },
        html: subContainer.outerHTML,
        cssVars
    };
  });
  
  fs.writeFileSync('scratch/kalakar_styles.json', JSON.stringify(styles, null, 2));
  console.log('Extracted styles successfully!');
  await browser.close();
})();
