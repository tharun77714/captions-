/**
 * PARITY TEST FIXTURES
 * 
 * Canonical subtitle data for regression testing.
 * Every fixture is deterministic — no random content.
 * These fixtures are permanent and must never change once committed.
 */

export interface FixtureWord {
  word: string;
  start: number;
  end: number;
}

export interface FixtureSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: FixtureWord[];
}

export interface Fixture {
  id: string;
  name: string;
  description: string;
  segments: FixtureSegment[];
}

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 1: Single Word
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_SINGLE_WORD: Fixture = {
  id: 'single-word',
  name: 'Single Word',
  description: 'One segment with one word. Tests minimal rendering path.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 0.8,
      text: 'Hello',
      words: [{ word: 'Hello', start: 0.0, end: 0.8 }],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 2: Short Sentence
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_SHORT_SENTENCE: Fixture = {
  id: 'short-sentence',
  name: 'Short Sentence',
  description: 'One segment with 5 words. Tests basic word layout and spacing.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 2.5,
      text: 'The quick brown fox jumps',
      words: [
        { word: 'The', start: 0.0, end: 0.4 },
        { word: 'quick', start: 0.4, end: 0.9 },
        { word: 'brown', start: 0.9, end: 1.4 },
        { word: 'fox', start: 1.4, end: 1.8 },
        { word: 'jumps', start: 1.8, end: 2.5 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 3: Two-Line Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_TWO_LINE: Fixture = {
  id: 'two-line',
  name: 'Two-Line Subtitle',
  description: 'Text long enough to wrap to two lines. Tests line breaking and vertical spacing.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 3.5,
      text: 'Hello and welcome to Kalakaar the best subtitle editor',
      words: [
        { word: 'Hello', start: 0.0, end: 0.3 },
        { word: 'and', start: 0.3, end: 0.5 },
        { word: 'welcome', start: 0.5, end: 0.9 },
        { word: 'to', start: 0.9, end: 1.1 },
        { word: 'Kalakaar', start: 1.1, end: 1.6 },
        { word: 'the', start: 1.6, end: 1.8 },
        { word: 'best', start: 1.8, end: 2.2 },
        { word: 'subtitle', start: 2.2, end: 2.8 },
        { word: 'editor', start: 2.8, end: 3.5 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 4: Long Wrapped Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_LONG_WRAPPED: Fixture = {
  id: 'long-wrapped',
  name: 'Long Wrapped Subtitle',
  description: 'Very long text that wraps to 3+ lines. Tests maxWidth constraint and overflow.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 6.0,
      text: 'This is a deliberately long subtitle that should wrap across multiple lines to test the maximum width constraint and verify that overflow behavior is correct',
      words: [
        { word: 'This', start: 0.0, end: 0.3 },
        { word: 'is', start: 0.3, end: 0.5 },
        { word: 'a', start: 0.5, end: 0.6 },
        { word: 'deliberately', start: 0.6, end: 1.2 },
        { word: 'long', start: 1.2, end: 1.5 },
        { word: 'subtitle', start: 1.5, end: 2.0 },
        { word: 'that', start: 2.0, end: 2.3 },
        { word: 'should', start: 2.3, end: 2.6 },
        { word: 'wrap', start: 2.6, end: 2.9 },
        { word: 'across', start: 2.9, end: 3.3 },
        { word: 'multiple', start: 3.3, end: 3.7 },
        { word: 'lines', start: 3.7, end: 4.0 },
        { word: 'to', start: 4.0, end: 4.2 },
        { word: 'test', start: 4.2, end: 4.5 },
        { word: 'the', start: 4.5, end: 4.6 },
        { word: 'maximum', start: 4.6, end: 5.0 },
        { word: 'width', start: 5.0, end: 5.3 },
        { word: 'constraint', start: 5.3, end: 5.7 },
        { word: 'and', start: 5.7, end: 5.8 },
        { word: 'verify', start: 5.8, end: 5.85 },
        { word: 'that', start: 5.85, end: 5.88 },
        { word: 'overflow', start: 5.88, end: 5.92 },
        { word: 'behavior', start: 5.92, end: 5.95 },
        { word: 'is', start: 5.95, end: 5.97 },
        { word: 'correct', start: 5.97, end: 6.0 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 5: Karaoke Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_KARAOKE: Fixture = {
  id: 'karaoke',
  name: 'Karaoke Subtitle',
  description: 'Words with tight timing for karaoke highlight testing. Each word is 200-400ms.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 2.0,
      text: 'Never gonna give you up',
      words: [
        { word: 'Never', start: 0.0, end: 0.35 },
        { word: 'gonna', start: 0.35, end: 0.7 },
        { word: 'give', start: 0.7, end: 1.0 },
        { word: 'you', start: 1.0, end: 1.3 },
        { word: 'up', start: 1.3, end: 2.0 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 6: Highlight Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_HIGHLIGHT: Fixture = {
  id: 'highlight',
  name: 'Highlight Subtitle',
  description: 'Tests color/scale/background highlight modes. Middle word is active at t=1.2s.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 3.0,
      text: 'Click the subscribe button now',
      words: [
        { word: 'Click', start: 0.0, end: 0.5 },
        { word: 'the', start: 0.5, end: 0.8 },
        { word: 'subscribe', start: 0.8, end: 1.5 },
        { word: 'button', start: 1.5, end: 2.2 },
        { word: 'now', start: 2.2, end: 3.0 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 7: Background Box Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_BACKGROUND_BOX: Fixture = {
  id: 'background-box',
  name: 'Background Box Subtitle',
  description: 'Tests unified background box rendering with padding and border radius.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 2.5,
      text: 'Background box test',
      words: [
        { word: 'Background', start: 0.0, end: 0.8 },
        { word: 'box', start: 0.8, end: 1.5 },
        { word: 'test', start: 1.5, end: 2.5 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 8: Stroke-Heavy Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_STROKE_HEAVY: Fixture = {
  id: 'stroke-heavy',
  name: 'Stroke-Heavy Subtitle',
  description: 'Tests thick text stroke rendering. Verifies stroke does not clip text.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 2.0,
      text: 'BOLD STROKE TEXT',
      words: [
        { word: 'BOLD', start: 0.0, end: 0.6 },
        { word: 'STROKE', start: 0.6, end: 1.2 },
        { word: 'TEXT', start: 1.2, end: 2.0 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 9: Shadow-Heavy Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_SHADOW_HEAVY: Fixture = {
  id: 'shadow-heavy',
  name: 'Shadow-Heavy Subtitle',
  description: 'Tests large shadow blur and glow effects.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 2.0,
      text: 'Glowing shadow text',
      words: [
        { word: 'Glowing', start: 0.0, end: 0.6 },
        { word: 'shadow', start: 0.6, end: 1.2 },
        { word: 'text', start: 1.2, end: 2.0 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE 10: Fast Speech Subtitle
// ═══════════════════════════════════════════════════════════════════════
export const FIXTURE_FAST_SPEECH: Fixture = {
  id: 'fast-speech',
  name: 'Fast Speech Subtitle',
  description: 'Rapid-fire words with 100-150ms each. Tests timing precision and karaoke at speed.',
  segments: [
    {
      id: 1,
      start: 0.0,
      end: 1.2,
      text: 'I am going to talk really fast right now okay',
      words: [
        { word: 'I', start: 0.0, end: 0.1 },
        { word: 'am', start: 0.1, end: 0.2 },
        { word: 'going', start: 0.2, end: 0.35 },
        { word: 'to', start: 0.35, end: 0.4 },
        { word: 'talk', start: 0.4, end: 0.55 },
        { word: 'really', start: 0.55, end: 0.7 },
        { word: 'fast', start: 0.7, end: 0.8 },
        { word: 'right', start: 0.8, end: 0.9 },
        { word: 'now', start: 0.9, end: 1.0 },
        { word: 'okay', start: 1.0, end: 1.2 },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// FIXTURE REGISTRY
// ═══════════════════════════════════════════════════════════════════════
export const ALL_FIXTURES: Fixture[] = [
  FIXTURE_SINGLE_WORD,
  FIXTURE_SHORT_SENTENCE,
  FIXTURE_TWO_LINE,
  FIXTURE_LONG_WRAPPED,
  FIXTURE_KARAOKE,
  FIXTURE_HIGHLIGHT,
  FIXTURE_BACKGROUND_BOX,
  FIXTURE_STROKE_HEAVY,
  FIXTURE_SHADOW_HEAVY,
  FIXTURE_FAST_SPEECH,
];
