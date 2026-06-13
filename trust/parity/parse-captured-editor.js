/**
 * Parse templates from previously captured kalakar_editor.html
 * This file contains the full editor DOM with all slider values visible.
 * 
 * We extract the style panel control values from the HTML directly.
 */
const fs = require('fs');

const html = fs.readFileSync('scratch/kalakar_editor.html', 'utf-8');

// ═══ Extract slider controls ═══
// Pattern: aria-label="X" ... aria-valuenow="Y" aria-valuemin="A" aria-valuemax="B"
const sliderPattern = /aria-label="([^"]+)"[^>]*?aria-valuemin="([^"]+)"[^>]*?aria-valuemax="([^"]+)"[^>]*?aria-valuenow="([^"]+)"/g;
// Also try reverse order
const sliderPattern2 = /aria-valuenow="([^"]+)"[^>]*?aria-label="([^"]+)"[^>]*?aria-valuemin="([^"]+)"[^>]*?aria-valuemax="([^"]+)"/g;
// And: id="slider-control-X" value="Y"
const sliderPattern3 = /id="slider-control-([^"]+)"[^>]*?value="([^"]+)"/g;

console.log('═══ KALAKAR EDITOR — SLIDER CONTROLS ═══\n');

const sliders = {};

// Method 1: aria-label based
let match;
while ((match = sliderPattern.exec(html)) !== null) {
  const [_, label, min, max, current] = match;
  sliders[label] = { current, min, max };
}

// Method 2: id="slider-control-X"
while ((match = sliderPattern3.exec(html)) !== null) {
  const [_, name, value] = match;
  if (!sliders[name]) {
    sliders[name] = { current: value, min: '?', max: '?' };
  } else {
    sliders[name].current = value; // override with input value
  }
}

for (const [label, val] of Object.entries(sliders)) {
  console.log(`  ${label}: ${val.current} (range: ${val.min}–${val.max})`);
}

// ═══ Extract toggle switches ═══
console.log('\n═══ TOGGLE SWITCHES ═══\n');
const switchPattern = /data-state="(checked|unchecked)"[^>]*?class="[^"]*peer[^"]*"/g;
// Find labels near switches
const switchSections = html.match(/<label[^>]*>[^<]+<\/label>\s*<button[^>]*role="switch"[^>]*data-state="(checked|unchecked)"/g) || [];
for (const section of switchSections) {
  const labelMatch = section.match(/<label[^>]*>([^<]+)<\/label>/);
  const stateMatch = section.match(/data-state="(checked|unchecked)"/);
  if (labelMatch && stateMatch) {
    console.log(`  ${labelMatch[1].trim()}: ${stateMatch[1]}`);
  }
}

// ═══ Extract template preview texts ═══
console.log('\n═══ TEMPLATE PREVIEWS ═══\n');
// Templates show as cards with name + preview text
const templateData = fs.readFileSync('scratch/kalakar_templates.json', 'utf-8');
const templates = JSON.parse(templateData);

// Parse template names and features from text entries
const templateEntries = templates.texts.filter(t => {
  return /^(Kalakar|Ali|Clean|Double|Bubble|Hormozi|Editing|Mr Beast|Iman|Devin|Highlighted|Black|Pixelated|Ziada|Liquid|Top Up|Mota|Tabahi|Deep|Seedha|Thora|Delhi|Zero)/i.test(t);
});

for (const entry of templateEntries) {
  const lines = entry.split('\n');
  const name = lines[0].replace(/New$/, '').trim();
  const previewText = lines.slice(1, -1).join(' ').trim() || lines[1]?.trim() || '';
  const features = [];
  const lastLine = lines[lines.length - 1];
  if (lastLine.includes('Bold')) features.push('Bold');
  if (lastLine.includes('Shadow')) features.push('Shadow');
  if (lines[0].includes('New')) features.push('New');
  
  const isUppercase = previewText === previewText.toUpperCase() && previewText.length > 3;
  
  console.log(`  ${name.padEnd(25)} Preview: "${previewText.substring(0, 40)}" | Features: [${features.join(', ')}] | Uppercase: ${isUppercase}`);
}

// ═══ Extract transition types from HTML ═══
console.log('\n═══ TRANSITION TYPES ═══\n');
const transData = JSON.parse(fs.readFileSync('scratch/kalakar_transitions.json', 'utf-8'));
// Transitions tab has: Word/Line toggle, transition type buttons, Speed Mode, Speed slider
console.log('  Target modes: Word, Line');
console.log('  Speed Mode: Dynamic (toggle found)');
console.log('  Speed slider: range 0-??, current value=1');

// Look for transition type names in the HTML
const transitionHTML = fs.readFileSync('scratch/kalakar_transitions.html', 'utf-8');
const transNames = transitionHTML.match(/(None|Fade|Pop|Scale|Slide|Zoom|Bounce)/gi) || [];
const uniqueTransitions = [...new Set(transNames.map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()))];
console.log(`  Transition types found: ${uniqueTransitions.join(', ')}`);

// ═══ Extract audio features ═══
console.log('\n═══ AI AUDIO ═══\n');
const audioData = JSON.parse(fs.readFileSync('scratch/kalakar_audio.json', 'utf-8'));
console.log(`  Features: ${JSON.stringify(audioData, null, 2)}`);

// ═══ Extract export options ═══
console.log('\n═══ EXPORT OPTIONS ═══\n');
const exportData = JSON.parse(fs.readFileSync('scratch/kalakar_export.json', 'utf-8'));
console.log(`  Options: ${JSON.stringify(exportData, null, 2)}`);

// ═══ Build the template style map ═══
console.log('\n═══ TEMPLATE STYLE DERIVATION ═══\n');
console.log('Based on visual features from preview cards:\n');

const templateStyles = {};
for (const entry of templateEntries) {
  const lines = entry.split('\n');
  const rawName = lines[0].replace(/New$/, '').trim();
  const previewText = lines.slice(1).filter(l => !['Bold', 'Shadow', 'BoldShadow', 'New'].includes(l.trim())).join(' ').trim();
  const lastLine = lines[lines.length - 1];
  
  const hasBold = entry.includes('Bold');
  const hasShadow = entry.includes('Shadow');
  const isNew = lines[0].includes('New');
  const isUppercase = previewText === previewText.toUpperCase() && previewText.length > 3;
  
  templateStyles[rawName] = {
    id: rawName.toLowerCase().replace(/\s+/g, '-'),
    name: rawName,
    isNew,
    fontWeight: hasBold ? 800 : 700,
    textTransform: isUppercase ? 'uppercase' : 'none',
    hasShadow,
    previewText: previewText.substring(0, 40),
  };
  
  console.log(`  ${rawName.padEnd(25)} bold=${hasBold} shadow=${hasShadow} uppercase=${isUppercase} new=${isNew}`);
}

// Write derived data
fs.writeFileSync('parity/reports/template_derived_styles.json', JSON.stringify(templateStyles, null, 2));
console.log(`\nOutput: parity/reports/template_derived_styles.json`);
console.log(`Templates derived: ${Object.keys(templateStyles).length}`);
