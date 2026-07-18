import type { Word } from '@/store/editor-store';
import {
  SEMANTIC_DICTIONARIES,
  SEMANTIC_COLORS,
  SEMANTIC_ANIMATIONS,
  SEMANTIC_EMOJIS
} from './semantic-dictionary';

export interface SemanticTag {
  wordId: string;
  categories: string[];
  confidence: number;
  suggestedColor?: string;
  suggestedAnimation?: string;
  suggestedEmoji?: string;
}

export const SEMANTIC_ENGINE_VERSION = 1;

function hasNumber(word: string): boolean {
  return /\d/.test(word);
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Single-pass semantic enrichment engine.
 * Processes an array of words and returns a sparse map of semantic tags.
 * Only words that match a category will have an entry in the map.
 */
export function enrichTranscript(words: Word[]): Record<string, SemanticTag> {
  const tags: Record<string, SemanticTag> = {};

  for (const word of words) {
    const normalized = normalizeWord(word.word);
    const matchedCategories: string[] = [];
    
    // Check dictionaries
    for (const [category, dict] of Object.entries(SEMANTIC_DICTIONARIES)) {
      if (dict.includes(normalized)) {
        matchedCategories.push(category);
      }
    }

    // Special case for numbers: Often mapped to 'money' or 'authority' contexts.
    // We can tag them as 'money' by default for styling presets if desired, 
    // or create a dedicated 'number' category. 
    // Preserving V1 behavior: Numbers trigger 'money' styles in Hormozi preset.
    if (hasNumber(word.word) && !matchedCategories.includes('money')) {
      matchedCategories.push('money');
    }

    if (matchedCategories.length > 0) {
      // Pick primary category (first match) to assign primary suggestions
      const primary = matchedCategories[0];
      
      // Randomly select one emoji from the primary category pool
      const emojiPool = SEMANTIC_EMOJIS[primary];
      const suggestedEmoji = emojiPool ? emojiPool[Math.floor(Math.random() * emojiPool.length)] : undefined;

      tags[word.id] = {
        wordId: word.id,
        categories: matchedCategories,
        confidence: 0.9, // Hardcoded confidence for static dictionaries
        suggestedColor: SEMANTIC_COLORS[primary],
        suggestedAnimation: SEMANTIC_ANIMATIONS[primary],
        suggestedEmoji
      };
    }
  }

  return tags;
}
