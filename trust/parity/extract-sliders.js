const fs = require('fs');
const html = fs.readFileSync('scratch/kalakar_editor.html', 'utf-8');

console.log('=== SLIDER CONTROLS (id="slider-control-*") ===\n');
const m1 = [...html.matchAll(/id="slider-control-([^"]+)"[^>]*?value="([^"]+)"/g)];
m1.forEach(m => console.log(`  ${m[1]}: ${m[2]}`));

console.log('\n=== ARIA SLIDERS (aria-label + valuenow) ===\n');
const m2 = [...html.matchAll(/aria-label="([^"]+)"[^>]*?aria-valuenow="([^"]+)"/g)];
m2.forEach(m => console.log(`  ${m[1]}: ${m[2]}`));

console.log('\n=== REVERSED ARIA (valuenow before label) ===\n');
const m3 = [...html.matchAll(/aria-valuenow="([^"]+)"[^>]*?aria-label="([^"]+)"/g)];
m3.forEach(m => console.log(`  ${m[2]}: ${m[1]}`));

console.log('\n=== DATA-STATE SWITCHES ===\n');
const m4 = [...html.matchAll(/data-state="(checked|unchecked)"[^>]*class="[^"]*peer/g)];
m4.forEach((m, i) => console.log(`  Switch ${i}: ${m[1]}`));

console.log('\n=== COLOR STYLE VALUES ===\n');
const m5 = [...html.matchAll(/style="[^"]*background-color:\s*([^;"]+)/g)];
const unique = new Set();
m5.forEach(m => {
  const c = m[1].trim();
  if (!unique.has(c) && c !== 'transparent') {
    unique.add(c);
    console.log(`  ${c}`);
  }
});
