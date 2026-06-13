/**
 * Parse extracted Kalakaar template data and produce a clean summary report.
 * Reads: parity/reports/kalakar_template_styles.json
 * Writes: parity/reports/template_summary.json
 */
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync('parity/reports/kalakar_template_styles.json', 'utf-8'));

const summary = {};

const TEMPLATES = Object.keys(raw).filter(k => k !== '__style_panel_state__');

for (const name of TEMPLATES) {
  const data = raw[name];
  if (data.error) {
    summary[name] = { error: data.error };
    continue;
  }

  const spans = data.wordSpans || [];
  if (spans.length === 0) {
    summary[name] = { error: 'No word spans found' };
    continue;
  }

  // Find the subtitle word spans (visible text over the video)
  // The first few spans with actual subtitle text will have the styling
  // Filter: look for spans that are positioned in the video area
  // Video area is roughly the center of the 1920x1080 viewport
  const subtitleSpans = spans.filter(s => {
    const r = s.rect;
    // Must be in video area (not sidebar buttons)
    return r.y > 200 && r.x > 100 && r.w > 3 && r.h > 10;
  });

  // Take the first subtitle span as representative
  const rep = subtitleSpans[0] || spans[0];
  const styles = rep.styles;

  // Determine if there's a container (background box)
  const container = data.containerStyle;

  summary[name] = {
    wordCount: subtitleSpans.length,
    sampleText: rep.text,
    font: {
      family: styles.fontFamily,
      size: styles.fontSize,
      weight: styles.fontWeight,
      style: styles.fontStyle,
    },
    color: styles.color,
    backgroundColor: styles.backgroundColor,
    textShadow: styles.textShadow,
    textStroke: styles.webkitTextStroke,
    textTransform: styles.textTransform,
    letterSpacing: styles.letterSpacing,
    lineHeight: styles.lineHeight,
    opacity: styles.opacity,
    transform: styles.transform,
    padding: styles.padding,
    borderRadius: styles.borderRadius,
    filter: styles.filter,
    container: container ? {
      backgroundColor: container.backgroundColor,
      padding: container.padding,
      borderRadius: container.borderRadius,
      boxShadow: container.boxShadow,
    } : null,
  };
}

// Also extract style panel controls
const panelState = raw['__style_panel_state__'];
summary['__controls__'] = panelState;

const outPath = 'parity/reports/template_summary.json';
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

// Print summary table
console.log('\n═══ TEMPLATE STYLE SUMMARY ═══\n');
console.log('Template'.padEnd(25) + 'Font'.padEnd(30) + 'Size'.padEnd(8) + 'Weight'.padEnd(8) + 'Color'.padEnd(30) + 'Shadow'.padEnd(10) + 'Transform');
console.log('─'.repeat(140));

for (const name of TEMPLATES) {
  const s = summary[name];
  if (s.error) {
    console.log(`${name.padEnd(25)} ERROR: ${s.error}`);
    continue;
  }
  const font = (s.font.family || '').split(',')[0].replace(/"/g, '').trim().substring(0, 25);
  const size = (s.font.size || '').substring(0, 6);
  const weight = (s.font.weight || '').substring(0, 6);
  const color = (s.color || '').substring(0, 28);
  const shadow = s.textShadow !== 'none' ? 'YES' : 'no';
  const transform = s.textTransform || 'none';
  console.log(`${name.padEnd(25)}${font.padEnd(30)}${size.padEnd(8)}${weight.padEnd(8)}${color.padEnd(30)}${shadow.padEnd(10)}${transform}`);
}

console.log(`\nTotal templates: ${TEMPLATES.length}`);
console.log(`Output: ${outPath}`);
