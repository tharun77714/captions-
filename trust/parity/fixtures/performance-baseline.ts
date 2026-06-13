/**
 * PERFORMANCE BASELINE BENCHMARK
 * 
 * Measures critical editor operations across different segment counts.
 * Results become the performance baseline — any regression after implementation
 * must be investigated before merging.
 * 
 * Test dimensions:
 *   100 segments / 500 segments / 1000 segments / 5000 words
 * 
 * Metrics:
 *   - Store initialization time
 *   - History snapshot push time
 *   - Text mutation time (updateSegmentText)
 *   - Style mutation time (setSubtitleStyle) 
 *   - Segment split time
 *   - Auto line break time
 *   - Filler removal time
 *   - Template apply time (simulated)
 */

// ── Generate synthetic segments ─────────────────────────────────────
function generateSegments(count: number) {
  const segments = [];
  const wordsPerSegment = 5;
  let time = 0;

  for (let i = 0; i < count; i++) {
    const words = [];
    const segStart = time;

    for (let w = 0; w < wordsPerSegment; w++) {
      const wordStart = time;
      time += 0.3;
      words.push({
        id: `w-${i}-${w}`,
        word: `word${w}`,
        start: wordStart,
        end: time,
      });
    }

    segments.push({
      id: i,
      start: segStart,
      end: time,
      text: words.map(w => w.word).join(' '),
      words,
    });

    time += 0.1; // gap between segments
  }

  return segments;
}

// ── Benchmark runner ────────────────────────────────────────────────
function bench(label: string, fn: () => void, iterations: number = 100): { avg: number; max: number; min: number } {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    max: Math.max(...times),
    min: Math.min(...times),
  };
}

// ── Simulated store operations ──────────────────────────────────────
function simulateHistoryPush(segments: any[]) {
  // Deep clone for snapshot
  const snapshot = JSON.parse(JSON.stringify(segments));
  return snapshot;
}

function simulateUpdateSegmentText(segments: any[], segId: number, newText: string) {
  return segments.map(s =>
    s.id === segId ? { ...s, text: newText } : s
  );
}

function simulateSplitSegment(segments: any[], segId: number) {
  const idx = segments.findIndex(s => s.id === segId);
  if (idx === -1) return segments;
  const seg = segments[idx];
  const mid = (seg.start + seg.end) / 2;
  const firstWords = seg.words.filter((w: any) => w.end <= mid);
  const secondWords = seg.words.filter((w: any) => w.start >= mid);
  const s1 = { ...seg, end: mid, text: firstWords.map((w: any) => w.word).join(' '), words: firstWords };
  const s2 = { ...seg, id: seg.id + 10000, start: mid, text: secondWords.map((w: any) => w.word).join(' '), words: secondWords };
  return [...segments.slice(0, idx), s1, s2, ...segments.slice(idx + 1)];
}

function simulateAutoLineBreak(segments: any[], maxChars: number) {
  return segments.map((seg: any) => {
    const words = seg.text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars && line.length > 0) {
        lines.push(line.trim());
        line = w;
      } else {
        line += ' ' + w;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return { ...seg, text: lines.join('\n') };
  });
}

function simulateRemoveFillers(segments: any[]) {
  const fillers = new Set(['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally']);
  return segments.map((seg: any) => ({
    ...seg,
    text: seg.text.split(' ').filter((w: string) => !fillers.has(w.toLowerCase())).join(' '),
    words: seg.words.filter((w: any) => !fillers.has(w.word.toLowerCase())),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// RUN BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════
function runBenchmarks() {
  const testSizes = [100, 500, 1000];
  console.log('═══ PERFORMANCE BASELINE ═══\n');
  console.log('Operation'.padEnd(30) + '100 segs'.padEnd(20) + '500 segs'.padEnd(20) + '1000 segs'.padEnd(20));
  console.log('─'.repeat(90));

  const results: Record<string, Record<number, { avg: number; max: number }>> = {};

  for (const size of testSizes) {
    const segments = generateSegments(size);

    // 1. History snapshot push
    const histResult = bench(`history_push_${size}`, () => {
      simulateHistoryPush(segments);
    }, 50);

    // 2. Update segment text
    const updateResult = bench(`update_text_${size}`, () => {
      simulateUpdateSegmentText(segments, Math.floor(size / 2), 'Updated text here');
    }, 100);

    // 3. Split segment
    const splitResult = bench(`split_segment_${size}`, () => {
      simulateSplitSegment(segments, Math.floor(size / 2));
    }, 100);

    // 4. Auto line break
    const lineBreakResult = bench(`auto_linebreak_${size}`, () => {
      simulateAutoLineBreak(segments, 24);
    }, 20);

    // 5. Remove fillers
    const fillersResult = bench(`remove_fillers_${size}`, () => {
      simulateRemoveFillers(segments);
    }, 20);

    // 6. Template apply (style deep merge)
    const templateStyle = {
      fontFamily: 'Montserrat', fontSize: 32, fontWeight: 800,
      textColor: '#FF0000', backgroundColor: 'rgba(0,0,0,0.8)',
      strokeColor: '#000', strokeWidth: 2, shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 8,
    };
    const templateResult = bench(`template_apply_${size}`, () => {
      // Template apply doesn't scale with segments, but measure anyway
      const merged = { ...templateStyle, applied: true };
      return merged;
    }, 100);

    results[`history_push`] = results[`history_push`] || {};
    results[`history_push`][size] = histResult;
    results[`update_text`] = results[`update_text`] || {};
    results[`update_text`][size] = updateResult;
    results[`split_segment`] = results[`split_segment`] || {};
    results[`split_segment`][size] = splitResult;
    results[`auto_linebreak`] = results[`auto_linebreak`] || {};
    results[`auto_linebreak`][size] = lineBreakResult;
    results[`remove_fillers`] = results[`remove_fillers`] || {};
    results[`remove_fillers`][size] = fillersResult;
    results[`template_apply`] = results[`template_apply`] || {};
    results[`template_apply`][size] = templateResult;
  }

  for (const [op, sizes] of Object.entries(results)) {
    let line = op.padEnd(30);
    for (const size of testSizes) {
      const r = sizes[size];
      line += `${r.avg.toFixed(2)}ms (max ${r.max.toFixed(1)}ms)`.padEnd(20);
    }
    console.log(line);
  }

  // 5000 word test
  console.log('\n──── 5000 Word Segment Test ────');
  const bigWords = Array.from({ length: 5000 }, (_, i) => ({
    id: `w-0-${i}`, word: `word${i}`, start: i * 0.1, end: (i + 1) * 0.1,
  }));
  const bigSegments = [{ id: 0, start: 0, end: 500, text: bigWords.map(w => w.word).join(' '), words: bigWords }];

  const bigHist = bench('history_push_5000w', () => simulateHistoryPush(bigSegments), 10);
  const bigLineBreak = bench('auto_linebreak_5000w', () => simulateAutoLineBreak(bigSegments, 24), 5);

  console.log(`History push:   ${bigHist.avg.toFixed(2)}ms avg, ${bigHist.max.toFixed(1)}ms max`);
  console.log(`Auto linebreak: ${bigLineBreak.avg.toFixed(2)}ms avg, ${bigLineBreak.max.toFixed(1)}ms max`);

  // Summary
  console.log('\n═══ PERFORMANCE THRESHOLDS ═══');
  console.log('Target: All operations < 16ms for 60fps responsiveness');
  console.log('Acceptable: < 50ms for non-realtime operations (split, linebreak)');
  console.log('Warning: > 100ms for any operation');

  let warnings = 0;
  for (const [op, sizes] of Object.entries(results)) {
    for (const [size, r] of Object.entries(sizes)) {
      if (r.max > 100) {
        console.log(`⚠ WARNING: ${op} @ ${size} segments: max=${r.max.toFixed(1)}ms`);
        warnings++;
      }
    }
  }
  if (bigHist.max > 100) { console.log(`⚠ WARNING: history_push @ 5000 words: max=${bigHist.max.toFixed(1)}ms`); warnings++; }
  if (bigLineBreak.max > 100) { console.log(`⚠ WARNING: auto_linebreak @ 5000 words: max=${bigLineBreak.max.toFixed(1)}ms`); warnings++; }

  if (warnings === 0) {
    console.log('✅ All operations within threshold');
  }

  console.log('\n═══ BASELINE COMPLETE ═══');
}

runBenchmarks();
