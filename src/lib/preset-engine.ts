import type { Word, Segment } from '@/store/editor-store';
import type { ResolvedWordStyle, WordAnimation, GradientConfig } from '@/lib/subtitle-schema-v3';
import type { SemanticTag } from '@/lib/semantic-engine';
import { enrichTranscript } from '@/lib/semantic-engine';

export interface CreatorPreset {
  id: string;
  name: string;
  version: number;
  description: string;
  author: string;
  thumbnailGradient: string;
}

export const PRESET_FONT_MAP: Record<string, string> = {
  'hormozi': 'Montserrat',
  'ali': 'Outfit',
  'iman': 'Space Grotesk',
  'dev': 'Bebas Neue',
};

export const PRESETS: CreatorPreset[] = [
  {
    id: 'hormozi',
    name: 'Hormozi',
    version: 1,
    description: 'High energy, yellow & green highlights, pop animations.',
    author: 'Alex Hormozi',
    thumbnailGradient: 'linear-gradient(135deg, #FFEA00 0%, #FF9D00 100%)'
  },
  {
    id: 'ali',
    name: 'Ali Abdaal',
    version: 1,
    description: 'Educational, soft blue highlights, fade ins.',
    author: 'Ali Abdaal',
    thumbnailGradient: 'linear-gradient(135deg, #4DB8FF 0%, #1E90FF 100%)'
  },
  {
    id: 'iman',
    name: 'Iman Gadzhi',
    version: 1,
    description: 'Luxurious, glowing white, typewriter text.',
    author: 'Iman Gadzhi',
    thumbnailGradient: 'linear-gradient(135deg, #FFFFFF 0%, #A0A0A0 100%)'
  },
  {
    id: 'dev',
    name: 'Dev Gadhvi',
    version: 1,
    description: 'Aggressive, red & yellow, heavy scale.',
    author: 'Dev Gadhvi',
    thumbnailGradient: 'linear-gradient(135deg, #FF3366 0%, #FF9933 100%)'
  }
];

function hasCategory(tag: SemanticTag | undefined, category: string): boolean {
  return tag?.categories.includes(category) || false;
}

/**
 * The V2 dynamic rule evaluator.
 * Returns sparse style overrides based on semantic tagging instead of raw regex.
 */
export function evaluatePresetRule(
  semanticTag: SemanticTag | undefined,
  presetId: string,
  version: number
): Partial<ResolvedWordStyle> | null {
  if (!presetId) return null;

  const overrides: Partial<ResolvedWordStyle> = {};
  
  if (presetId === 'hormozi') {
    overrides.fontFamily = 'Montserrat';
    overrides.fontWeight = 900;
    overrides.textTransform = 'uppercase';
    
    // Hormozi V1 logic
    if (hasCategory(semanticTag, 'money')) {
      overrides.textColor = '#FFEA00'; // Yellow
      overrides.animation = 'pop';
    } else if (hasCategory(semanticTag, 'action')) {
      overrides.textColor = '#00FFB2'; // Green
      overrides.animation = 'scale';
    } else if (hasCategory(semanticTag, 'negative')) {
      overrides.textColor = '#FF3333'; // Red
      overrides.animation = 'shake';
    }
  } 
  
  else if (presetId === 'ali') {
    overrides.fontFamily = 'Outfit';
    overrides.fontWeight = 600;
    
    if (hasCategory(semanticTag, 'education')) {
      overrides.textColor = '#4DB8FF';
      overrides.animation = 'fadeIn';
    } else if (hasCategory(semanticTag, 'money')) {
      overrides.textColor = '#50C878';
    }
  }

  else if (presetId === 'iman') {
    overrides.fontFamily = 'Space Grotesk';
    overrides.fontWeight = 500;
    
    if (hasCategory(semanticTag, 'authority') || hasCategory(semanticTag, 'money')) {
      overrides.textColor = '#FFFFFF';
      overrides.shadowColor = '#FFFFFF';
      overrides.shadowBlur = 15;
      overrides.animation = 'glow';
    } else if (hasCategory(semanticTag, 'negative')) {
      overrides.textColor = '#808080';
    }
  }
  
  else if (presetId === 'dev') {
    overrides.fontFamily = 'Bebas Neue';
    overrides.fontWeight = 400; // Bebas is inherently bold
    overrides.textTransform = 'uppercase';
    
    if (hasCategory(semanticTag, 'action') || hasCategory(semanticTag, 'money')) {
      overrides.textColor = '#FF9933';
      overrides.animation = 'scale';
      overrides.scaleX = 1.2;
      overrides.scaleY = 1.2;
    } else if (hasCategory(semanticTag, 'negative')) {
      overrides.textColor = '#FF3366';
      overrides.animation = 'shake';
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
}

export interface PreviewWord {
  word: string;
  color?: string;
  animation?: string;
}

/**
 * Preset Preview API. 
 * Allows UI and ChatGPT to preview what the NLP rule engine generates without modifying state.
 */
export function generatePresetPreview(transcript: string, presetId: string, version: number): PreviewWord[] {
  const words = transcript.split(/\s+/).filter(Boolean);
  
  // Fake words for the semantic engine to enrich
  const fakeWords: Word[] = words.map((w, i) => ({
    id: `pw-${i}`,
    word: w,
    start: i,
    end: i + 1,
    probability: 1
  }));

  const semanticMap = enrichTranscript(fakeWords);

  return fakeWords.map(word => {
    const rules = evaluatePresetRule(semanticMap[word.id], presetId, version);
    return {
      word: word.word,
      color: rules?.textColor,
      animation: rules?.animation
    };
  });
}
