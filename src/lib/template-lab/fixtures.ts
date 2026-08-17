/**
 * TEMPLATE LAB — Static Fixtures
 *
 * Provides 'entry', 'active', and 'stress' states.
 * Development-only. Never imported by production code.
 *
 * Rules:
 * - Indic scripts are NEVER uppercased
 * - No transliteration or translation by the template component
 * - Bilingual structures are provided via secondaryWords
 */

import type { LabWord, LabSegment, StoryboardState } from './types';

// ─── Regular Fixtures (Entry / Active) ───────────────────────────────────────

export const ENGLISH_WORDS: LabWord[] = [
  { id: 'en-0', text: 'This',       start: 0.0, end: 0.3 },
  { id: 'en-1', text: 'changes',    start: 0.3, end: 0.7 },
  { id: 'en-2', text: 'everything', start: 0.7, end: 1.2 },
  { id: 'en-3', text: 'you',        start: 1.2, end: 1.5 },
  { id: 'en-4', text: 'thought',    start: 1.5, end: 2.0 },
  { id: 'en-5', text: 'you',        start: 2.0, end: 2.3 },
  { id: 'en-6', text: 'knew',       start: 2.3, end: 2.8 },
];

export const TELUGU_WORDS: LabWord[] = [
  { id: 'te-0', text: 'ఇది',              start: 0.0, end: 0.3 },
  { id: 'te-1', text: 'మీరు',             start: 0.3, end: 0.7 },
  { id: 'te-2', text: 'అనుకున్న',         start: 0.7, end: 1.2 },
  { id: 'te-3', text: 'విధానాన్ని',       start: 1.2, end: 1.8 },
  { id: 'te-4', text: 'పూర్తిగా',         start: 1.8, end: 2.3 },
  { id: 'te-5', text: 'మార్చేస్తుంది',     start: 2.3, end: 3.0 },
];

export const MIXED_WORDS: LabWord[] = [
  { id: 'mx-0', text: 'ఈ',          start: 0.0, end: 0.2 },
  { id: 'mx-1', text: 'simple',     start: 0.2, end: 0.6 },
  { id: 'mx-2', text: 'trick',      start: 0.6, end: 1.0 },
  { id: 'mx-3', text: 'మీ',         start: 1.0, end: 1.2 },
  { id: 'mx-4', text: 'videos',     start: 1.2, end: 1.8 },
  { id: 'mx-5', text: 'ని',         start: 1.8, end: 2.0 },
  { id: 'mx-6', text: 'next',       start: 2.0, end: 2.3 },
  { id: 'mx-7', text: 'level',      start: 2.3, end: 2.7 },
  { id: 'mx-8', text: 'చేస్తుంది',   start: 2.7, end: 3.2 },
];

// ─── Stress Fixtures (Long Words / Many Words) ───────────────────────────────

export const ENGLISH_STRESS_WORDS: LabWord[] = [
  { id: 'en-s0', text: 'The', start: 0, end: 0.2 },
  { id: 'en-s1', text: 'institutionalization', start: 0.2, end: 1.2 },
  { id: 'en-s2', text: 'of', start: 1.2, end: 1.4 },
  { id: 'en-s3', text: 'incomprehensibilities', start: 1.4, end: 2.5 },
];

export const TELUGU_STRESS_WORDS: LabWord[] = [
  { id: 'te-s0', text: 'ఈ', start: 0, end: 0.2 },
  { id: 'te-s1', text: 'విశ్వవిద్యాలయములోని', start: 0.2, end: 1.5 },
  { id: 'te-s2', text: 'విద్యార్థినివిద్యార్థులందరూ', start: 1.5, end: 3.0 },
];

export const MIXED_STRESS_WORDS: LabWord[] = [
  { id: 'mx-s0', text: 'ఈ', start: 0, end: 0.2 },
  { id: 'mx-s1', text: 'internationalization', start: 0.2, end: 1.2 },
  { id: 'mx-s2', text: 'వల్ల', start: 1.2, end: 1.5 },
  { id: 'mx-s3', text: 'సమస్యలొస్తాయి', start: 1.5, end: 2.5 },
];

// ─── Bilingual Fixtures (Primary + Secondary) ────────────────────────────────

export const BILINGUAL_ENGLISH_SEC: LabWord[] = [
  { id: 'be-0', text: 'This', start: 0, end: 0.5 },
  { id: 'be-1', text: 'changes', start: 0.5, end: 1.0 },
  { id: 'be-2', text: 'everything', start: 1.0, end: 2.0 },
];

export const BILINGUAL_TELUGU_PRI: LabWord[] = [
  { id: 'bt-0', text: 'ఇది', start: 0, end: 0.5 },
  { id: 'bt-1', text: 'అంతటినీ', start: 0.5, end: 1.2 },
  { id: 'bt-2', text: 'మార్చేస్తుంది', start: 1.2, end: 2.0 },
];

export const BILINGUAL_ROMANIZED_SEC: LabWord[] = [
  { id: 'br-0', text: 'Idi', start: 0, end: 0.5 },
  { id: 'br-1', text: 'anthatinee', start: 0.5, end: 1.2 },
  { id: 'br-2', text: 'marchestundi', start: 1.2, end: 2.0 },
];

// ─── Segment Builders ────────────────────────────────────────────────────────

export function getFixtureSegment(language: string, state: StoryboardState): LabSegment {
  if (state === 'stress') {
    switch (language) {
      case 'telugu': return { words: TELUGU_STRESS_WORDS, language: 'telugu' };
      case 'mixed': return { words: MIXED_STRESS_WORDS, language: 'mixed' };
      default: return { words: ENGLISH_STRESS_WORDS, language: 'english' };
    }
  }

  // Bilingual setup logic handles secondary lanes
  let base: LabSegment;
  switch (language) {
    case 'telugu': 
      base = { words: TELUGU_WORDS, language: 'telugu', secondaryWords: BILINGUAL_ROMANIZED_SEC, secondaryLanguage: 'english' };
      break;
    case 'mixed': 
      base = { words: MIXED_WORDS, language: 'mixed', secondaryWords: BILINGUAL_ENGLISH_SEC, secondaryLanguage: 'english' };
      break;
    default: 
      // Do not duplicate English as a secondary lane for English-only input
      base = { words: ENGLISH_WORDS, language: 'english' };
      break;
  }
  return base;
}

export function getActiveIndexForState(words: LabWord[], state: StoryboardState): number {
  if (words.length === 0) return -1;
  if (state === 'entry') return 0;
  if (state === 'stress') return 1; // Pick the long word usually at index 1
  if (state === 'completed') {
    // In completed state, we want to simulate the moment right after the 'active' word completes.
    // The active index will be treated as the word that just completed by the grouping logic.
    return Math.floor(words.length / 2);
  }
  return Math.floor(words.length / 2); // 'active'
}

/** Full text for display in the info panel */
export const FIXTURE_FULL_TEXT: Record<string, string> = {
  english: 'This changes everything you thought you knew',
  telugu: 'ఇది మీరు అనుకున్న విధానాన్ని పూర్తిగా మార్చేస్తుంది',
  mixed: 'ఈ simple trick మీ videos ని next level చేస్తుంది',
};
