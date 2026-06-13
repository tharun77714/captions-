const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1. Templates
  console.log('Extracting Templates...');
  await page.goto('file://' + path.resolve('scratch/kalakar_templates.html'));
  const templatesData = await page.evaluate(() => {
     // Find all template items
     const items = Array.from(document.querySelectorAll('.aspect-video.cursor-pointer, .group.relative.flex.flex-col, div:has(> img[alt*="Template"])'));
     const extracted = [];
     
     // Fallback text extraction if exact classes differ
     const textNodes = Array.from(document.querySelectorAll('h3, p, span, h4')).map(n => n.innerText).filter(t => t);
     
     // Let's try to find text near images
     const images = Array.from(document.querySelectorAll('img[src*="template"], img[alt*="Template"], img'));
     
     images.forEach(img => {
         const container = img.closest('div');
         if(container && container.innerText) {
             extracted.push({
                 preview: img.src,
                 text: container.innerText.trim()
             });
         }
     });
     
     // Let's extract everything inside the sidebar that looks like a list
     const sidebarList = Array.from(document.querySelectorAll('.space-y-4 > div, .grid > div'));
     const texts = sidebarList.map(div => div.innerText.trim()).filter(t => t.length > 0 && t.length < 100);
     
     return {
         extractedImages: extracted,
         texts: texts,
         rawTextNodes: textNodes.slice(0, 100)
     };
  });
  
  fs.writeFileSync('scratch/kalakar_templates.json', JSON.stringify(templatesData, null, 2));

  // 2. Transitions
  console.log('Extracting Transitions...');
  await page.goto('file://' + path.resolve('scratch/kalakar_transitions.html'));
  const transitionsData = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(b => b);
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim()).filter(l => l);
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, value: i.value, placeholder: i.placeholder }));
      const toggles = Array.from(document.querySelectorAll('[role="switch"], [role="radio"]')).map(t => ({ val: t.value || t.innerText, checked: t.getAttribute('aria-checked') }));
      return { buttons, labels, inputs, toggles };
  });
  fs.writeFileSync('scratch/kalakar_transitions.json', JSON.stringify(transitionsData, null, 2));

  // 3. Audio
  console.log('Extracting Audio...');
  await page.goto('file://' + path.resolve('scratch/kalakar_audio.html'));
  const audioData = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h2, h3, h4, p, label')).map(t => t.innerText.trim()).filter(t => t);
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(b => b);
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, value: i.value }));
      return { texts, buttons, inputs };
  });
  fs.writeFileSync('scratch/kalakar_audio.json', JSON.stringify(audioData, null, 2));

  // 4. Export
  console.log('Extracting Export Modal...');
  await page.goto('file://' + path.resolve('scratch/kalakar_export_modal.html'));
  const exportData = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h2, h3, h4, p, label, span')).map(t => t.innerText.trim()).filter(t => t);
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(b => b);
      const selects = Array.from(document.querySelectorAll('select')).map(s => {
          return {
              value: s.value,
              options: Array.from(s.querySelectorAll('option')).map(o => o.innerText.trim())
          };
      });
      // Try to find exact divs that look like buttons or options
      const options = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"]')).map(o => o.innerText.trim());
      
      return { texts: [...new Set(texts)], buttons: [...new Set(buttons)], selects, options };
  });
  fs.writeFileSync('scratch/kalakar_export.json', JSON.stringify(exportData, null, 2));

  await browser.close();
  console.log('All JSONs extracted!');
})();
