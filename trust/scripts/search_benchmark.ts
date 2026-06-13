import { performance } from 'perf_hooks';

interface Word {
  id: string;
  word: string;
  start: number;
  end: number;
}

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: Word[];
}

function generateSegments(numSegments: number, wordsPerSegment: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < numSegments; i++) {
    const words: Word[] = [];
    let text = '';
    for (let j = 0; j < wordsPerSegment; j++) {
      const wordText = `word_${i}_${j} `;
      text += wordText;
      words.push({ id: `${i}_${j}`, word: wordText.trim(), start: 0, end: 1 });
    }
    segments.push({ id: i, start: 0, end: 1, text: text.trim(), words });
  }
  return segments;
}

function benchmarkSearch(segments: Segment[], query: string) {
  const t0 = performance.now();
  const q = query.toLowerCase();
  const filtered = segments.filter(s => s.text.toLowerCase().includes(q));
  const t1 = performance.now();
  
  const allWords = segments.flatMap((seg) => seg.words.map((w) => ({ ...w, segId: seg.id })));
  const filteredWords = allWords.filter((w) => w.word.toLowerCase().includes(q));
  const t2 = performance.now();
  
  return {
    segmentsCount: segments.length,
    wordsCount: segments.reduce((acc, s) => acc + s.words.length, 0),
    segmentFilterMs: (t1 - t0).toFixed(3),
    wordFilterMs: (t2 - t1).toFixed(3),
    totalMs: (t2 - t0).toFixed(3)
  };
}

console.log("SEARCH BENCHMARK AUDIT");
console.log("======================");
console.table([
  benchmarkSearch(generateSegments(100, 5), "word_50_2"),
  benchmarkSearch(generateSegments(500, 5), "word_250_2"),
  benchmarkSearch(generateSegments(1000, 5), "word_500_2"),
  benchmarkSearch(generateSegments(1000, 10), "word_500_2") // 10000 words
]);
