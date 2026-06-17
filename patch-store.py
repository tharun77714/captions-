import re

with open('src/store/editor-store.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add resegmentWithoutWords
helper_code = """
const resegmentWithoutWords = (oldSegs: Segment[] | undefined, newOriginalSegs: Segment[]): Segment[] => {
  if (!oldSegs || oldSegs.length === 0) return [];
  if (!newOriginalSegs || newOriginalSegs.length === 0) return [];

  const fullText = oldSegs.map(s => s.text).join(' ').trim();
  const words = fullText.split(/\s+/).filter(Boolean);
  
  const newSegTexts: string[][] = newOriginalSegs.map(() => []);
  const totalDuration = newOriginalSegs.reduce((acc, s) => acc + (s.end - s.start), 0);
  
  if (totalDuration === 0) return oldSegs;

  let currentWordIdx = 0;
  
  newOriginalSegs.forEach((seg, idx) => {
    const duration = seg.end - seg.start;
    const ratio = duration / totalDuration;
    const wordsCount = Math.max(1, Math.floor(ratio * words.length));
    
    for (let i = 0; i < wordsCount && currentWordIdx < words.length; i++) {
      newSegTexts[idx].push(words[currentWordIdx++]);
    }
  });

  # Distribute remaining words
  while (currentWordIdx < words.length) {
    newSegTexts[newSegTexts.length - 1].push(words[currentWordIdx++]);
  }
  
  return newOriginalSegs.map((newSeg, idx) => {
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

// ─── Store ────────────────────────────────────────────────────────────
"""

text = text.replace('// ─── Store ────────────────────────────────────────────────────────────', helper_code)

# Remove the syntax error fragment
# The fragment is:
#              console.error(`Reconstructed: "${reconstructedText}"`);
#           }
#         });
#         
#         return newSegs.map((newSeg, idx) => {
#           const finalStr = newSegTexts[idx].join(' ');
#           return {
#             id: newSeg.id,
#             start: newSeg.start,
#             end: newSeg.end,
#             text: finalStr || '...',
#             words: []
#           };
#         });
#       };
fragment_pattern = re.compile(r'\s+console\.error\(`Reconstructed: "\$\{reconstructedText\}"`\);\s+\}\s+\}\);\s+return newSegs\.map\(\(newSeg, idx\) => \{\s+const finalStr = newSegTexts\[idx\]\.join\(\' \'\);\s+return \{\s+id: newSeg\.id,\s+start: newSeg\.start,\s+end: newSeg\.end,\s+text: finalStr \|\| \'\.\.\.\',\s+words: \[\]\s+\};\s+\}\);\s+\};', re.MULTILINE)

text = re.sub(fragment_pattern, '', text)

with open('src/store/editor-store.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("Patch successful!")
