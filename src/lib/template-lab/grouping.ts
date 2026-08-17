import { LabWord, StoryboardState, GroupedWords } from './types';
import { getActiveIndexForState } from './fixtures';

/**
 * Given a full array of words and a storyboard state, partitions the array
 * into a structured GroupedWords object, ensuring perfect traceability.
 */
/**
 * Given a full array of words and a storyboard state, partitions the array
 * into a structured GroupedWords object, ensuring perfect traceability.
 */
export function getGroupedWords(
  sourceWords: LabWord[],
  storyboardState: StoryboardState,
  visibleWindowSize: number = 8,
): GroupedWords {
  if (sourceWords.length === 0) {
    return {
      sourceWords,
      visibleWords: [],
      previousWords: [],
      activeWord: null,
      upcomingWords: [],
      hiddenByStoryboardState: [],
      activeSourceIndex: -1,
    };
  }

  const activeSourceIndex = getActiveIndexForState(sourceWords, storyboardState);
  
  // Calculate a sliding window of visible words
  const halfWindow = Math.floor(visibleWindowSize / 2);
  let startIdx = Math.max(0, activeSourceIndex - halfWindow);
  let endIdx = startIdx + visibleWindowSize;

  if (endIdx > sourceWords.length) {
    endIdx = sourceWords.length;
    startIdx = Math.max(0, endIdx - visibleWindowSize);
  }

  const visibleWords = sourceWords.slice(startIdx, endIdx);
  const hiddenByStoryboardState = sourceWords.filter(w => !visibleWords.some(vw => vw.id === w.id));

  const activeWord = activeSourceIndex >= 0 && activeSourceIndex < sourceWords.length
    ? sourceWords[activeSourceIndex]
    : null;

  // Split visible words into previous and upcoming relative to the active word
  const previousWords: LabWord[] = [];
  const upcomingWords: LabWord[] = [];
  
  for (const word of visibleWords) {
    const idx = sourceWords.findIndex(w => w.id === word.id);
    if (idx < activeSourceIndex) {
      previousWords.push(word);
    } else if (idx > activeSourceIndex) {
      upcomingWords.push(word);
    }
  }

  // If state is 'completed', shift the logic so that the 'active' word is actually treated as previous
  // and we simulate the exact moment after it finishes.
  if (storyboardState === 'completed' && activeWord) {
    // In completed state, the 'activeWord' has just finished. We keep activeWord as null
    // and move the formerly active word into previousWords.
    const completedWord = activeWord;
    previousWords.push(completedWord);
    
    return {
      sourceWords,
      visibleWords,
      previousWords,
      activeWord: null,
      upcomingWords,
      hiddenByStoryboardState,
      activeSourceIndex, // Preserve the index for secondary mapping reference
    };
  }

  return {
    sourceWords,
    visibleWords,
    previousWords,
    activeWord,
    upcomingWords,
    hiddenByStoryboardState,
    activeSourceIndex,
  };
}

/**
 * Maps a secondary language track to the primary track using timestamp overlap.
 * Uses maximum positive overlap, then midpoint containment, then closest midpoint fallback.
 */
export function getSecondaryGroupedWords(
  primaryGrouped: GroupedWords,
  secondarySourceWords: LabWord[],
  storyboardState: StoryboardState,
  visibleWindowSize: number = 8,
): GroupedWords | undefined {
  if (secondarySourceWords.length === 0) return undefined;

  let mappedSecondaryIndex = -1;
  const pIdx = primaryGrouped.activeSourceIndex;

  if (pIdx >= 0 && pIdx < primaryGrouped.sourceWords.length) {
    const pWord = primaryGrouped.sourceWords[pIdx];
    const pMidpoint = pWord.start + (pWord.end - pWord.start) / 2;

    // 1. Maximum positive temporal overlap
    let maxOverlap = 0;
    for (let i = 0; i < secondarySourceWords.length; i++) {
      const sw = secondarySourceWords[i];
      const overlapStart = Math.max(pWord.start, sw.start);
      const overlapEnd = Math.min(pWord.end, sw.end);
      const overlap = overlapEnd - overlapStart;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        mappedSecondaryIndex = i;
      }
    }

    // 2. Midpoint containment
    if (mappedSecondaryIndex === -1) {
      mappedSecondaryIndex = secondarySourceWords.findIndex(
        sw => pMidpoint >= sw.start && pMidpoint <= sw.end
      );
    }

    // 3. Closest midpoint fallback
    if (mappedSecondaryIndex === -1) {
      let minDistance = Infinity;
      for (let i = 0; i < secondarySourceWords.length; i++) {
        const sw = secondarySourceWords[i];
        const sMidpoint = sw.start + (sw.end - sw.start) / 2;
        const dist = Math.abs(pMidpoint - sMidpoint);
        if (dist < minDistance) {
          minDistance = dist;
          mappedSecondaryIndex = i;
        }
      }
    }
  }

  if (mappedSecondaryIndex === -1) {
    // Fallback if no primary word active, map to the same relative state
    return getGroupedWords(secondarySourceWords, storyboardState, visibleWindowSize);
  }

  // Create sliding window around the mapped secondary index
  const halfWindow = Math.floor(visibleWindowSize / 2);
  let startIdx = Math.max(0, mappedSecondaryIndex - halfWindow);
  let endIdx = startIdx + visibleWindowSize;

  if (endIdx > secondarySourceWords.length) {
    endIdx = secondarySourceWords.length;
    startIdx = Math.max(0, endIdx - visibleWindowSize);
  }

  const visibleWords = secondarySourceWords.slice(startIdx, endIdx);
  const hiddenByStoryboardState = secondarySourceWords.filter(w => !visibleWords.some(vw => vw.id === w.id));

  const secondaryWord = secondarySourceWords[mappedSecondaryIndex];

  const previousWords: LabWord[] = [];
  const upcomingWords: LabWord[] = [];
  for (const word of visibleWords) {
    const idx = secondarySourceWords.findIndex(w => w.id === word.id);
    if (idx < mappedSecondaryIndex) {
      previousWords.push(word);
    } else if (idx > mappedSecondaryIndex) {
      upcomingWords.push(word);
    }
  }

  if (storyboardState === 'completed') {
    previousWords.push(secondaryWord);
    return {
      sourceWords: secondarySourceWords,
      visibleWords,
      previousWords,
      activeWord: null,
      upcomingWords,
      hiddenByStoryboardState,
      activeSourceIndex: mappedSecondaryIndex,
    };
  }

  return {
    sourceWords: secondarySourceWords,
    visibleWords,
    previousWords,
    activeWord: secondaryWord,
    upcomingWords,
    hiddenByStoryboardState,
    activeSourceIndex: mappedSecondaryIndex,
  };
}
