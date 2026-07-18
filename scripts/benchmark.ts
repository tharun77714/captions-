import { evaluatePresetRule } from '../src/lib/preset-engine';
import { resolveWordStyle } from '../src/lib/subtitle-schema-v3';

// Mock schema and state
const generateMockWords = (count: number) => {
  const words = [];
  const dictionary = ["money", "apple", "secret", "listen", "therefore", "fail", "1000", "hello", "world"];
  for (let i = 0; i < count; i++) {
    words.push({
      id: `w_${i}`,
      text: dictionary[i % dictionary.length],
      start: i * 0.5,
      end: (i + 1) * 0.5
    });
  }
  return words;
};

const baseProjectStyle = {
  _version: 3,
  font: { family: 'Inter', weight: 400, italic: false, underline: false, textTransform: 'none' },
  fontSize: 48,
  letterSpacing: 0,
  textColor: { solid: '#ffffff', mode: 'solid' },
  stroke: { enabled: false, color: '#000000', width: 0 },
  shadow: { color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
  background: { enabled: false, color: 'transparent', borderRadius: 0, paddingX: 0, paddingY: 0 },
  overrides: { segmentStyles: {}, wordStyles: {} },
  positionX: 50,
  positionY: 80,
  alignment: 'center'
};

function runBenchmark() {
  console.log('--- BLOCKER 3: PERFORMANCE BENCHMARKS ---');
  const sizes = [100, 1000, 5000];
  
  sizes.forEach(size => {
    const words = generateMockWords(size);
    const state: any = {
      subtitleStyle: JSON.parse(JSON.stringify(baseProjectStyle)),
      segments: [{ id: 1, words }]
    };
    
    // Simulate setting activePreset
    const start = performance.now();
    state.subtitleStyle.activePreset = { id: 'hormozi', version: 1 };
    const presetApplyTime = performance.now() - start;
    
    // Simulate Render Cascade (resolving styles for all words)
    const renderStart = performance.now();
    const resolvedStyles: any = {};
    state.segments.forEach((seg: any) => {
      seg.words.forEach((w: any) => {
        resolvedStyles[w.id] = resolveWordStyle(state.subtitleStyle, seg.id, w.id, w.text);
      });
    });
    const renderTime = performance.now() - renderStart;
    
    console.log(`Words: ${size}`);
    console.log(`- Preset App Time (State Update): ${presetApplyTime.toFixed(4)}ms`);
    console.log(`- Render Cascade Time (JIT Eval): ${renderTime.toFixed(4)}ms`);
  });

  console.log('\n--- BLOCKER 5: STATE SIZE COMPARISON ---');
  const words1000 = generateMockWords(1000);
  const baseState = { subtitleStyle: JSON.parse(JSON.stringify(baseProjectStyle)), segments: [{ id: 1, words: words1000 }] };
  const sizeBefore = JSON.stringify(baseState.subtitleStyle).length;
  
  // V1 Materialized vs V2 Dynamic
  // In V1, we would write overrides for every word
  const v1State = JSON.parse(JSON.stringify(baseState));
  v1State.segments[0].words.forEach((w: any) => {
    v1State.subtitleStyle.overrides.wordStyles[w.id] = { textColor: '#FFEA00' };
  });
  const sizeV1 = JSON.stringify(v1State.subtitleStyle).length;
  
  // In V2, we just set activePreset
  const v2State = JSON.parse(JSON.stringify(baseState));
  v2State.subtitleStyle.activePreset = { id: 'hormozi', version: 1 };
  const sizeV2 = JSON.stringify(v2State.subtitleStyle).length;

  console.log(`Base State Size: ${sizeBefore} bytes`);
  console.log(`V1 (Materialized) State Size: ${sizeV1} bytes`);
  console.log(`V2 (Dynamic) State Size: ${sizeV2} bytes`);

  console.log('\n--- BLOCKER 4: MANUAL OVERRIDE VALIDATION ---');
  const testState: any = {
    subtitleStyle: JSON.parse(JSON.stringify(baseProjectStyle)),
    segments: [{ id: 1, words: [{ id: 'w_apple', text: 'Apple' }, { id: 'w_money', text: 'money' }] }]
  };
  
  const fakeTagMoney: any = { categories: ['money'] };
  const fakeTagApple: any = { categories: [] };

  // 1. Apply Hormozi
  testState.subtitleStyle.activePreset = { id: 'hormozi', version: 1 };
  console.log("Applied Hormozi.");
  console.log("Money Word Style:", resolveWordStyle(testState.subtitleStyle, 1, 'w_money', fakeTagMoney).textColor);
  
  // 2. Color word Apple red
  testState.subtitleStyle.overrides.wordStyles['w_apple'] = { textColor: '#FF0000' };
  console.log("Colored 'Apple' red.");
  console.log("Apple Word Style (Hormozi):", resolveWordStyle(testState.subtitleStyle, 1, 'w_apple', fakeTagApple).textColor);
  
  // 3. Switch to Ali
  testState.subtitleStyle.activePreset = { id: 'ali', version: 1 };
  console.log("Switched to Ali.");
  console.log("Apple Word Style (Ali):", resolveWordStyle(testState.subtitleStyle, 1, 'w_apple', fakeTagApple).textColor);
  
  // 4. Switch to Iman
  testState.subtitleStyle.activePreset = { id: 'iman', version: 1 };
  console.log("Switched to Iman.");
  console.log("Apple Word Style (Iman):", resolveWordStyle(testState.subtitleStyle, 1, 'w_apple', fakeTagApple).textColor);

  console.log('\n--- BLOCKER 2: EXPORT VALIDATION (JSON) ---');
  const exportPayload = {
    w_apple: resolveWordStyle(testState.subtitleStyle, 1, 'w_apple', fakeTagApple),
    w_money: resolveWordStyle(testState.subtitleStyle, 1, 'w_money', fakeTagMoney)
  };
  console.log(JSON.stringify(exportPayload, null, 2));
}

runBenchmark();
