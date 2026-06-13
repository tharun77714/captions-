const { chromium } = require('playwright');

const PROJECT_URL = 'http://localhost:3000/dashboard/projects/74432fcc-d772-4c66-96bd-a72422a31ccb/editor';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Loading editor...');
  await page.goto(PROJECT_URL, { waitUntil: 'networkidle' });

  // Wait for video player and subtitle box
  await page.waitForSelector('.video-player', { timeout: 10000 }).catch(() => {});
  
  // Give it a moment to ensure subtitles are rendered
  await page.waitForTimeout(2000);

  const measurements = await page.evaluate(() => {
    const subtitleBox = document.querySelector('span.px-3.py-1\\.5');
    if (!subtitleBox) return { error: 'No subtitle box found' };

    const wordSpans = subtitleBox.querySelectorAll('span');
    if (wordSpans.length < 2) return { error: 'Not enough words' };

    let wordGap = -1;
    for (let i = 0; i < wordSpans.length - 1; i++) {
        const r1 = wordSpans[i].getBoundingClientRect();
        const r2 = wordSpans[i+1].getBoundingClientRect();
        if (Math.abs(r1.top - r2.top) < 5) {
            wordGap = r2.left - r1.right;
            break;
        }
    }

    // Measure line spacing (baseline to baseline distance)
    // Find first word on line 1, and first word on line 2
    let lineSpacing = -1;
    let firstLineTop = wordSpans[0].getBoundingClientRect().top;
    for (let i = 1; i < wordSpans.length; i++) {
        const rect = wordSpans[i].getBoundingClientRect();
        if (rect.top > firstLineTop + 10) { // Found next line
            lineSpacing = rect.top - firstLineTop;
            break;
        }
    }

    return {
      wordGapCss: wordGap,
      lineSpacingCss: lineSpacing,
      textWidthCss: subtitleBox.getBoundingClientRect().width,
      textHeightCss: subtitleBox.getBoundingClientRect().height
    };
  });

  console.log(measurements);
  await browser.close();
}

main().catch(console.error);
