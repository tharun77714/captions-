import assert from 'assert';

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: any[];
}

const resegmentWithoutWords = (oldSegs: Segment[], newSegs: Segment[]): Segment[] => {
  const newSegTexts = newSegs.map(() => [] as string[]);
  
  oldSegs.forEach(oldSeg => {
    const overlappingIdxs = newSegs
      .map((newSeg, idx) => ({ newSeg, idx }))
      .filter(({ newSeg }) => oldSeg.start < newSeg.end && oldSeg.end > newSeg.start);
      
    if (overlappingIdxs.length === 0) return;
    
    if (overlappingIdxs.length === 1) {
      newSegTexts[overlappingIdxs[0].idx].push(oldSeg.text);
      return;
    }
    
    const oldDuration = oldSeg.end - oldSeg.start;
    if (oldDuration <= 0) {
      newSegTexts[overlappingIdxs[0].idx].push(oldSeg.text);
      return;
    }
    
    const words = oldSeg.text.split(/\s+/).filter(Boolean);
    let currentWordIdx = 0;
    const reconstructed: string[] = [];
    
    overlappingIdxs.forEach(({ newSeg, idx }, i) => {
      if (i === overlappingIdxs.length - 1) {
        const remainder = words.slice(currentWordIdx).join(' ');
        if (remainder) {
          newSegTexts[idx].push(remainder);
          reconstructed.push(remainder);
        }
        return;
      }
      
      const overlapStart = Math.max(oldSeg.start, newSeg.start);
      const overlapEnd = Math.min(oldSeg.end, newSeg.end);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      const fraction = overlapDuration / oldDuration;
      
      const wordsToTake = Math.max(0, Math.round(words.length * fraction));
      const chunk = words.slice(currentWordIdx, currentWordIdx + wordsToTake).join(' ');
      if (chunk) {
        newSegTexts[idx].push(chunk);
        reconstructed.push(chunk);
      }
      
      currentWordIdx += wordsToTake;
    });
    
    const reconstructedText = reconstructed.join(' ').trim().replace(/\s+/g, ' ');
    const originalText = oldSeg.text.trim().replace(/\s+/g, ' ');
    if (words.length > 0 && reconstructedText !== originalText) {
       console.error(`CRITICAL ERROR: Text integrity mismatch!`);
       console.error(`Original: "${originalText}"`);
       console.error(`Reconstructed: "${reconstructedText}"`);
    }
  });
  
  return newSegs.map((newSeg, idx) => {
    const finalStr = newSegTexts[idx].join(' ');
    return {
      id: newSeg.id,
      start: newSeg.start,
      end: newSeg.end,
      text: finalStr || '...',
      words: []
    };
  });
};

function runTest() {
  console.log("Running autoLineBreak test...");

  const oldSegs: Segment[] = [
    { id: 1, start: 0, end: 10, text: "These are five translated words", words: [] }
  ];

  const newSegs: Segment[] = [
    { id: 1, start: 0, end: 3.33, text: "", words: [] },
    { id: 2, start: 3.33, end: 6.66, text: "", words: [] },
    { id: 3, start: 6.66, end: 10, text: "", words: [] }
  ];

  const result = resegmentWithoutWords(oldSegs, newSegs);
  
  console.log("Result:");
  result.forEach(r => console.log(`[${r.start.toFixed(2)} -> ${r.end.toFixed(2)}] ${r.text}`));
  
  assert.strictEqual(result[0].text, "These are");
  assert.strictEqual(result[1].text, "five translated");
  assert.strictEqual(result[2].text, "words");

  console.log("✅ Math division perfectly preserves words without duplication.");
}

runTest();
