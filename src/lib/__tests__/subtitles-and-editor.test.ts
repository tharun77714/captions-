import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { parseSrt, parseVtt, distributeSyntheticWords, tokenizeSubtitleText, findOverlappingCues, segmentsToSrt } from '../srt-export';
import { isMissingExportsTableError, mergeExportsAndProjects, BaseExportItem } from '../db-utils';
import { getTemplateById, getAllTemplates } from '../templates-data';
import { useEditorStore } from '../../store/editor-store';
import { saveDictionaryRule, getDictionaryRules, clearMemoryStorage } from '../custom-dictionary';
import { ensureV3, resolveWordStyle, getInterWordGap } from '../subtitle-schema-v3';
import { DEFAULT_STYLE } from '../subtitle-schema-v2';
import { compositionEngine, GeometrySolver, CaptionCompositionEngine } from '../caption-composition';

describe('Vidyut Master Implementation Test Suite', () => {
  let consoleErrors: string[] = [];
  const originalConsoleError = console.error;

  beforeEach(() => {
    consoleErrors = [];
    console.error = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      consoleErrors.push(msg);
      originalConsoleError(...args);
    };

    useEditorStore.setState({
      segments: [],
      originalSegments: [],
      transliteratedSegments: [],
      translatedSegments: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      subtitleMode: 'original',
      userId: 'test-user-id',
      captionConfig: { maxWordsPerLine: 5, maxCharsPerLine: 24, linesLimit: 1, captionDelay: 0 },
      subtitleStyle: ensureV3(DEFAULT_STYLE),
    });
    clearMemoryStorage();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    assert.strictEqual(consoleErrors.length, 0, `Captured unexpected console.error during test: ${consoleErrors.join('\n')}`);
  });

  describe('1. Shared Subtitle Tokenizer & Synthetic Timing Boundaries', () => {
    it('1. keeps punctuation attached to display word ("Hello, world!" -> ["Hello,", "world!"])', () => {
      const tokens = tokenizeSubtitleText('Hello, world!');
      assert.deepStrictEqual(tokens, ['Hello,', 'world!']);

      const teluguTokens = tokenizeSubtitleText('నమస్కారం! Welcome to Vidyut platform.');
      assert.deepStrictEqual(teluguTokens, ['నమస్కారం!', 'Welcome', 'to', 'Vidyut', 'platform.']);
    });

    it('2. keeps short cue word boundaries strictly inside the cue', () => {
      const words = distributeSyntheticWords('Quick cue', 10.0, 10.02, 'test-cue', 'original');
      assert.strictEqual(words.length, 2);
      assert.strictEqual(words[0].start, 10.0);
      assert.strictEqual(words[1].end, 10.02);
    });

    it('3. preserves exact 0.02-second imported cue segment and word end boundaries', () => {
      const store = useEditorStore.getState();
      store.importSubtitleSegments('original', [{ start: 0.0, end: 0.02, text: 'Ultra short' }]);
      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs.length, 1);
      assert.strictEqual(segs[0].start, 0.0);
      assert.strictEqual(segs[0].end, 0.02);
      assert.strictEqual(segs[0].words[segs[0].words.length - 1].end, 0.02);
    });

    it('4. ensures synthetic words omit fake probability confidence', () => {
      const words = distributeSyntheticWords('Test missing probability', 0.0, 2.0, 1, 'original');
      const wordObj = words[0] as unknown as { probability?: number };
      assert.strictEqual(wordObj.probability, undefined);
      assert.strictEqual(words[0].timingSource, 'synthetic');
    });

    it('5. preserves timingSource through transcript hydration', () => {
      const store = useEditorStore.getState();
      store.setTranscriptData(
        [{ id: 1, start: 0, end: 2, text: 'Speech vs synthetic' }],
        [{ word: 'Speech', start: 0, end: 1, probability: 0.95 }]
      );
      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].words[0].word, 'Speech');
    });

    it('6. produces positive duration words for a 0.005-second two-word cue', () => {
      const words = distributeSyntheticWords('two words', 0, 0.005, 1, 'original');
      assert.strictEqual(words.length, 2);
      assert.ok(words[0].start < words[0].end, 'Word 0 start < end');
      assert.ok(words[1].start < words[1].end, 'Word 1 start < end');
      assert.strictEqual(words[1].end, 0.005);
      assert.strictEqual(words[0].timingSource, 'synthetic');
      assert.strictEqual(words[1].timingSource, 'synthetic');
    });
  });

  describe('2. Segment ID Safety & Timestamp Parsing', () => {
    it('7. generates collision-safe segment IDs across all modes', () => {
      const store = useEditorStore.getState();
      store.importSubtitleSegments('original', [{ start: 0, end: 1, text: 'Original cue' }]);
      store.importSubtitleSegments('transliterated', [{ start: 1, end: 2, text: 'Transliterated cue' }]);
      const segs = useEditorStore.getState().transliteratedSegments;
      assert.strictEqual(segs.length, 1);
      assert.ok(segs[0].id > 0);
    });

    it('8. rejects malformed timestamps with trailing garbage', () => {
      const srt = parseSrt('1\n00:00:01abc --> 00:00:03,000\nGarbage timestamp');
      assert.strictEqual(srt.length, 0);
    });

    it('9. handles UTF-8 BOM and VTT cue settings', () => {
      const vtt = parseVtt('\uFEFFWEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000 align:start line:0\nClean VTT');
      assert.strictEqual(vtt.length, 1);
      assert.strictEqual(vtt[0].text, 'Clean VTT');
    });

    it('10. detects overlapping cues correctly', () => {
      const cues = [
        { start: 0.0, end: 2.0, text: 'First' },
        { start: 1.5, end: 3.0, text: 'Second' },
      ];
      const overlaps = findOverlappingCues(cues);
      assert.strictEqual(overlaps.length, 1);
      assert.strictEqual(overlaps[0].index1, 1);
    });
  });

  describe('3. Core Editor Actions & Styling Pipeline', () => {
    it('11. applyCreatorPreset sets activePreset correctly without getTemplateById', () => {
      const store = useEditorStore.getState();
      store.applyCreatorPreset('hormozi', 1);
      const style = useEditorStore.getState().subtitleStyle;
      assert.deepStrictEqual(style.activePreset, { id: 'hormozi', version: 1 });
      assert.strictEqual(useEditorStore.getState().canUndo, true);
    });

    it('12. updateSelectedWordsStyle and updateSegmentStyle write canonical overrides', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [{ id: 1, start: 0, end: 2, text: 'Hello world', words: [{ id: 'w-1', word: 'Hello', start: 0, end: 1 }, { id: 'w-2', word: 'world', start: 1, end: 2 }] }],
        selectedWordIds: ['w-1'],
      });

      store.updateSelectedWordsStyle({ textColor: '#ff0000' });
      store.updateSegmentStyle(1, { backgroundColor: '#00ff00' });

      const style = useEditorStore.getState().subtitleStyle;
      assert.strictEqual(style.overrides.wordStyles['w-1']?.textColor, '#ff0000');
      assert.strictEqual(style.overrides.segmentStyles[1]?.backgroundColor, '#00ff00');

      const resolvedW = resolveWordStyle(style, 1, 'w-1');
      assert.strictEqual(resolvedW.textColor, '#ff0000');
      assert.strictEqual(style.overrides.segmentStyles[1]?.backgroundColor, '#00ff00');
    });

    it('13. applyAiEmojis writes suggestedEmoji into wordStyles without mutating transcript text', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [{ id: 1, start: 0, end: 2, text: 'Lightning fast', words: [{ id: 'w-bolt', word: 'Lightning', start: 0, end: 1 }, { id: 'w-fast', word: 'fast', start: 1, end: 2 }] }],
        semanticTags: { 'w-bolt': { wordId: 'w-bolt', categories: ['emphasis'], confidence: 0.9, suggestedEmoji: '⚡' } },
      });

      store.applyAiEmojis();

      const segs = useEditorStore.getState().segments;
      const style = useEditorStore.getState().subtitleStyle;

      assert.strictEqual(segs[0].text, 'Lightning fast');
      assert.strictEqual(segs[0].words[0].word, 'Lightning');
      assert.strictEqual(segs[0].words[0].id, 'w-bolt');
      assert.strictEqual(style.overrides.wordStyles['w-bolt']?.emoji, '⚡');
    });

    it('13b. ensureV3 hardens migration against malformed inputs and scales legacy font sizes', () => {
      // Null / undefined / empty return complete valid objects
      const s1 = ensureV3(null);
      assert.strictEqual(s1._version, 3);
      assert.strictEqual(s1.fontSize, 160);
      assert.strictEqual(s1.canvasUnitVersion, 1);
      assert.ok(s1.font);
      assert.ok(s1.textColor);
      assert.ok(s1.stroke);
      assert.ok(s1.shadow);
      assert.ok(s1.background);
      assert.ok(s1.transition);
      assert.ok(s1.overrides);
      assert.strictEqual(s1.alignment, 'center');
      
      const s2 = ensureV3(undefined);
      assert.strictEqual(s2._version, 3);
      assert.ok(s2.font);
      
      const s3 = ensureV3({});
      assert.strictEqual(s3._version, 3);
      assert.strictEqual(s3.fontSize, 160);
      assert.ok(s3.font);

      // Non-finite font sizes
      const s4 = ensureV3({ _version: 3, fontSize: NaN, canvasUnitVersion: 1 });
      assert.strictEqual(s4.fontSize, 160);

      const s5 = ensureV3({ _version: 3, fontSize: Infinity, canvasUnitVersion: 1 });
      assert.strictEqual(s5.fontSize, 160);

      // Unversioned legacy migration < 60 scales to 96
      const s6 = ensureV3({ _version: 3, fontSize: 24 }); // unversioned
      assert.strictEqual(s6.fontSize, 96);
      assert.strictEqual(s6.canvasUnitVersion, 1);

      // Versioned modern 24 remains 24
      const s7 = ensureV3({ _version: 3, fontSize: 24, canvasUnitVersion: 1 });
      assert.strictEqual(s7.fontSize, 24);
      assert.strictEqual(s7.canvasUnitVersion, 1);

      // Existing >= 60 remains unchanged
      const s8 = ensureV3({ _version: 3, fontSize: 72 });
      assert.strictEqual(s8.fontSize, 72);
      
      // Idempotency and purity: original object is not mutated
      const original = { _version: 3, fontSize: 24 } as Record<string, unknown>;
      const s9 = ensureV3(original);
      assert.strictEqual(s9.fontSize, 96);
      assert.strictEqual(original.fontSize, 24);
      assert.strictEqual(original.canvasUnitVersion, undefined);

      // Prove returned nested objects are not shared between calls
      const s10 = ensureV3(null);
      const s11 = ensureV3(null);
      assert.notStrictEqual(s10.font, s11.font);
      assert.notStrictEqual(s10.textColor, s11.textColor);
      assert.notStrictEqual(s10.stroke, s11.stroke);
      assert.notStrictEqual(s10.shadow, s11.shadow);
      assert.notStrictEqual(s10.background, s11.background);
      assert.notStrictEqual(s10.transition, s11.transition);
      assert.notStrictEqual(s10.overrides, s11.overrides);
      assert.notStrictEqual(s10.overrides.wordStyles, s11.overrides.wordStyles);
      assert.notStrictEqual(s10.overrides.segmentStyles, s11.overrides.segmentStyles);
    });

    it('14. applyTemplate preserves positionX and positionY', () => {
      const store = useEditorStore.getState();
      const baseStyle = ensureV3(DEFAULT_STYLE);
      useEditorStore.setState({
        subtitleStyle: {
          ...baseStyle,
          positionX: 42,
          positionY: 88,
        },
      });

      store.applyTemplate('kalakar-glow');

      const style = useEditorStore.getState().subtitleStyle;
      assert.strictEqual(style.positionX, 42);
      assert.strictEqual(style.positionY, 88);
      assert.strictEqual(useEditorStore.getState().activeTemplateId, 'kalakar-glow');
    });

    it('15. setTranscriptData is deterministic without asynchronous history erasure', () => {
      const store = useEditorStore.getState();
      store.setTranscriptData([
        { id: 1, start: 0, end: 2, text: 'First caption' },
        { id: 2, start: 2, end: 4, text: 'Second caption' },
      ]);

      store.updateSegmentText(1, 'Updated caption');

      assert.strictEqual(useEditorStore.getState().segments[0].text, 'Updated caption');
      assert.strictEqual(useEditorStore.getState().canUndo, true);
    });

    it('16. setCurrentTime sets activeSegmentIndex = -1 when playhead is in a gap', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [
          { id: 1, start: 0, end: 1.0, text: 'Seg 1', words: [] },
          { id: 2, start: 2.0, end: 3.0, text: 'Seg 2', words: [] },
        ],
      });

      store.setCurrentTime(0.5);
      assert.strictEqual(useEditorStore.getState().activeSegmentIndex, 0);

      store.setCurrentTime(1.5); // In gap!
      assert.strictEqual(useEditorStore.getState().activeSegmentIndex, -1);
    });

    it('17. removeGaps creates no history when no gaps exist', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [
          { id: 1, start: 0, end: 1.0, text: 'Seg 1', words: [{ id: 'w1', word: 'Seg', start: 0, end: 0.5 }, { id: 'w2', word: '1', start: 0.5, end: 1.0 }] },
          { id: 2, start: 1.0, end: 2.0, text: 'Seg 2', words: [{ id: 'w3', word: 'Seg', start: 1.0, end: 1.5 }, { id: 'w4', word: '2', start: 1.5, end: 2.0 }] },
        ],
        originalSegments: [
          { id: 1, start: 0, end: 1.0, text: 'Seg 1', words: [{ id: 'w1', word: 'Seg', start: 0, end: 0.5 }, { id: 'w2', word: '1', start: 0.5, end: 1.0 }] },
          { id: 2, start: 1.0, end: 2.0, text: 'Seg 2', words: [{ id: 'w3', word: 'Seg', start: 1.0, end: 1.5 }, { id: 'w4', word: '2', start: 1.5, end: 2.0 }] },
        ],
        past: [],
        canUndo: false,
      });

      store.removeGaps();

      assert.strictEqual(useEditorStore.getState().past.length, 0);
      assert.strictEqual(useEditorStore.getState().canUndo, false);
    });

    it('18. updateSegmentText repeated edits generate collision-safe IDs', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [{ id: 1, start: 0, end: 2, text: 'Hello', words: [{ id: 'w-init', word: 'Hello', start: 0, end: 2 }] }],
      });

      store.updateSegmentText(1, 'Hello world');
      const words1 = useEditorStore.getState().segments[0].words;
      assert.strictEqual(words1.length, 2);
      assert.strictEqual(words1[0].id, 'w-init');

      store.updateSegmentText(1, 'Hello world extra tokens');
      const words2 = useEditorStore.getState().segments[0].words;
      assert.strictEqual(words2.length, 4);

      const allIds = words2.map((w) => w.id);
      const uniqueIds = new Set(allIds);
      assert.strictEqual(uniqueIds.size, allIds.length);
    });

    it('19. removeFillers removes single and phrase fillers ("you know")', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [{ id: 1, start: 0, end: 5, text: 'Um you know Namaskaram so Vidyut', words: [{ id: 'w1', word: 'Um', start: 0, end: 1 }, { id: 'w2', word: 'you', start: 1, end: 1.5 }, { id: 'w3', word: 'know', start: 1.5, end: 2 }, { id: 'w4', word: 'Namaskaram', start: 2, end: 3 }, { id: 'w5', word: 'so', start: 3, end: 4 }, { id: 'w6', word: 'Vidyut', start: 4, end: 5 }] }],
      });

      store.removeFillers();

      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].text, 'Namaskaram Vidyut');
      assert.strictEqual(segs[0].words.length, 2);
    });

    it('20. validateTimingModel catches non-finite, overlapping, and boundary-escaping words', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        segments: [{ id: 1, start: 0, end: 1, text: 'Escaped word', words: [{ id: 'w1', word: 'Escaped', start: 0, end: 2.0 }] }],
      });

      const report = store.validateTimingModel();
      assert.strictEqual(report.isValid, false);
      assert.ok(report.errors[0].includes('escapes bounds'));
    });
  });

  describe('4. Multilingual Data Integrity & Mode Resegmentation Audits', () => {
    it('21. autoSplitByWords and autoLineBreak preserve all words when transliterated is active mode', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        subtitleMode: 'transliterated',
        originalSegments: [{ id: 1, start: 0, end: 4, text: 'one two three', words: [{ id: 'wo-1', word: 'one', start: 0, end: 1 }, { id: 'wo-2', word: 'two', start: 1, end: 2 }, { id: 'wo-3', word: 'three', start: 2, end: 4 }] }],
        transliteratedSegments: [{ id: 1, start: 0, end: 4, text: 'namaskaram', words: [{ id: 'wt-1', word: 'namaskaram', start: 0, end: 4 }] }],
        translatedSegments: [{ id: 1, start: 0, end: 4, text: 'a b c d', words: [{ id: 'wtr-1', word: 'a', start: 0, end: 1 }, { id: 'wtr-2', word: 'b', start: 1, end: 2 }, { id: 'wtr-3', word: 'c', start: 2, end: 3 }, { id: 'wtr-4', word: 'd', start: 3, end: 4 }] }],
        segments: [{ id: 1, start: 0, end: 4, text: 'namaskaram', words: [{ id: 'wt-1', word: 'namaskaram', start: 0, end: 4 }] }],
      });

      store.autoSplitByWords(2);

      const state1 = useEditorStore.getState();
      assert.strictEqual(state1.originalSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'one two three');
      assert.strictEqual(state1.transliteratedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'namaskaram');
      assert.strictEqual(state1.translatedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'a b c d');

      assert.strictEqual(state1.originalSegments.flatMap((s) => s.words).length, 3);
      assert.strictEqual(state1.transliteratedSegments.flatMap((s) => s.words).length, 1);
      assert.strictEqual(state1.translatedSegments.flatMap((s) => s.words).length, 4);

      store.undo();
      const stateRestored = useEditorStore.getState();
      assert.strictEqual(stateRestored.originalSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'one two three');
      assert.strictEqual(stateRestored.transliteratedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'namaskaram');
      assert.strictEqual(stateRestored.translatedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'a b c d');
    });

    it('22. autoSplitByWords preserves all words when translated is active mode', () => {
      const store = useEditorStore.getState();
      useEditorStore.setState({
        subtitleMode: 'translated',
        originalSegments: [{ id: 1, start: 0, end: 4, text: 'one two three', words: [{ id: 'wo-1', word: 'one', start: 0, end: 1 }, { id: 'wo-2', word: 'two', start: 1, end: 2 }, { id: 'wo-3', word: 'three', start: 2, end: 4 }] }],
        transliteratedSegments: [{ id: 1, start: 0, end: 4, text: 'namaskaram', words: [{ id: 'wt-1', word: 'namaskaram', start: 0, end: 4 }] }],
        translatedSegments: [{ id: 1, start: 0, end: 4, text: 'a b c d', words: [{ id: 'wtr-1', word: 'a', start: 0, end: 1 }, { id: 'wtr-2', word: 'b', start: 1, end: 2 }, { id: 'wtr-3', word: 'c', start: 2, end: 3 }, { id: 'wtr-4', word: 'd', start: 3, end: 4 }] }],
        segments: [{ id: 1, start: 0, end: 4, text: 'a b c d', words: [{ id: 'wtr-1', word: 'a', start: 0, end: 1 }, { id: 'wtr-2', word: 'b', start: 1, end: 2 }, { id: 'wtr-3', word: 'c', start: 2, end: 3 }, { id: 'wtr-4', word: 'd', start: 3, end: 4 }] }],
      });

      store.autoSplitByWords(2);

      const state = useEditorStore.getState();
      assert.strictEqual(state.translatedSegments.length, 2);
      assert.strictEqual(state.originalSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'one two three');
      assert.strictEqual(state.transliteratedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'namaskaram');
      assert.strictEqual(state.translatedSegments.flatMap((s) => s.words).map((w) => w.word).join(' '), 'a b c d');
    });

    it('23. setTranscriptData generates mode-namespaced deterministic unique word IDs', () => {
      const store = useEditorStore.getState();
      store.setTranscriptData(
        [{ id: 1, start: 0, end: 2, text: 'hello world' }],
        [],
        [{ id: 1, start: 0, end: 2, text: 'namaskaram' }],
        [],
        [{ id: 1, start: 0, end: 2, text: 'greetings all' }],
        []
      );

      const origWords = useEditorStore.getState().originalSegments[0].words;
      const transWords = useEditorStore.getState().transliteratedSegments[0].words;
      const translatedWords = useEditorStore.getState().translatedSegments[0].words;

      const allIds = [...origWords, ...transWords, ...translatedWords].map((w) => w.id);
      assert.strictEqual(allIds.length, 5);
      const uniqueSet = new Set(allIds);
      assert.strictEqual(uniqueSet.size, 5);

      assert.ok(origWords[0].id.includes('original'));
      assert.ok(transWords[0].id.includes('transliterated'));
      assert.ok(translatedWords[0].id.includes('translated'));

      useEditorStore.getState().setTranscriptData(
        [{ id: 1, start: 0, end: 2, text: 'hello world' }],
        [],
        [{ id: 1, start: 0, end: 2, text: 'namaskaram' }],
        [],
        [{ id: 1, start: 0, end: 2, text: 'greetings all' }],
        []
      );
      const rehydratedOrigWords = useEditorStore.getState().originalSegments[0].words;
      assert.strictEqual(rehydratedOrigWords[0].id, origWords[0].id);

      useEditorStore.getState().updateSelectedWordsStyle({ textColor: '#ff0000' });
      const style = useEditorStore.getState().subtitleStyle;
      assert.strictEqual(style.overrides.wordStyles[transWords[0].id], undefined);
    });

    it('24. composition cache key includes word IDs preventing stale cache returns', () => {
      const layoutContext = {
        containerWidth: 1080,
        containerHeight: 1920,
        safeArea: 0,
        devicePixelRatio: 1,
        scaleFactor: 1,
        aspectRatio: 16 / 9,
        exportMode: false,
      };

      const seg1 = { id: 1, start: 0, end: 2, text: 'Hello', words: [{ id: 'old-id', word: 'Hello', start: 0, end: 2 }] };
      const blocks1 = compositionEngine.compose([seg1], ensureV3(DEFAULT_STYLE), layoutContext, 'social_reels');
      assert.strictEqual(blocks1[0].lines[0].words[0].id, 'old-id');

      const seg2 = { id: 1, start: 0, end: 2, text: 'Hello', words: [{ id: 'new-id', word: 'Hello', start: 0, end: 2 }] };
      const blocks2 = compositionEngine.compose([seg2], ensureV3(DEFAULT_STYLE), layoutContext, 'social_reels');

      assert.strictEqual(blocks2[0].lines[0].words[0].id, 'new-id');
    });
  });

  describe('5. Custom Dictionary Token Matching & Replacement Actions', () => {
    it('25. Apply Once replaces exactly one occurrence across target mode', () => {
      const userId = 'user-test-20';
      saveDictionaryRule(userId, 'Hyd', 'Hyderabad');
      const rules = getDictionaryRules(userId);

      const store = useEditorStore.getState();
      useEditorStore.setState({
        userId,
        subtitleMode: 'original',
        segments: [
          { id: 1, start: 0, end: 2, text: 'Hyd is great', words: [{ id: 'w1', word: 'Hyd', start: 0, end: 1 }, { id: 'w2', word: 'is', start: 1, end: 1.5 }, { id: 'w3', word: 'great', start: 1.5, end: 2 }] },
          { id: 2, start: 2, end: 4, text: 'I love Hyd', words: [{ id: 'w4', word: 'I', start: 2, end: 2.5 }, { id: 'w5', word: 'love', start: 2.5, end: 3 }, { id: 'w6', word: 'Hyd', start: 3, end: 4 }] },
        ],
        originalSegments: [
          { id: 1, start: 0, end: 2, text: 'Hyd is great', words: [{ id: 'w1', word: 'Hyd', start: 0, end: 1 }, { id: 'w2', word: 'is', start: 1, end: 1.5 }, { id: 'w3', word: 'great', start: 1.5, end: 2 }] },
          { id: 2, start: 2, end: 4, text: 'I love Hyd', words: [{ id: 'w4', word: 'I', start: 2, end: 2.5 }, { id: 'w5', word: 'love', start: 2.5, end: 3 }, { id: 'w6', word: 'Hyd', start: 3, end: 4 }] },
        ],
      });

      const res = store.applyDictionaryReplacements(rules, false, 'original');
      assert.strictEqual(res.replacementsCount, 1);

      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].text, 'Hyderabad is great');
      assert.strictEqual(segs[1].text, 'I love Hyd');
    });

    it('26. Apply All replaces all exact occurrences across target mode', () => {
      const userId = 'user-test-21';
      saveDictionaryRule(userId, 'Hyd', 'Hyderabad');
      const rules = getDictionaryRules(userId);

      const store = useEditorStore.getState();
      useEditorStore.setState({
        userId,
        subtitleMode: 'original',
        segments: [
          { id: 1, start: 0, end: 2, text: 'Hyd is great', words: [{ id: 'w1', word: 'Hyd', start: 0, end: 1 }, { id: 'w2', word: 'is', start: 1, end: 1.5 }, { id: 'w3', word: 'great', start: 1.5, end: 2 }] },
          { id: 2, start: 2, end: 4, text: 'I love Hyd', words: [{ id: 'w4', word: 'I', start: 2, end: 2.5 }, { id: 'w5', word: 'love', start: 2.5, end: 3 }, { id: 'w6', word: 'Hyd', start: 3, end: 4 }] },
        ],
        originalSegments: [
          { id: 1, start: 0, end: 2, text: 'Hyd is great', words: [{ id: 'w1', word: 'Hyd', start: 0, end: 1 }, { id: 'w2', word: 'is', start: 1, end: 1.5 }, { id: 'w3', word: 'great', start: 1.5, end: 2 }] },
          { id: 2, start: 2, end: 4, text: 'I love Hyd', words: [{ id: 'w4', word: 'I', start: 2, end: 2.5 }, { id: 'w5', word: 'love', start: 2.5, end: 3 }, { id: 'w6', word: 'Hyd', start: 3, end: 4 }] },
        ],
      });

      const res = store.applyDictionaryReplacements(rules, true, 'original');
      assert.strictEqual(res.replacementsCount, 2);

      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].text, 'Hyderabad is great');
      assert.strictEqual(segs[1].text, 'I love Hyderabad');
    });

    it('27. ensures "hyd" does NOT match inside "dehydrated"', () => {
      const userId = 'user-test-22';
      saveDictionaryRule(userId, 'hyd', 'Hyderabad');
      const rules = getDictionaryRules(userId);

      const store = useEditorStore.getState();
      useEditorStore.setState({
        userId,
        subtitleMode: 'original',
        segments: [
          { id: 1, start: 0, end: 2, text: 'Feeling dehydrated', words: [{ id: 'w1', word: 'Feeling', start: 0, end: 1 }, { id: 'w2', word: 'dehydrated', start: 1, end: 2 }] },
        ],
        originalSegments: [
          { id: 1, start: 0, end: 2, text: 'Feeling dehydrated', words: [{ id: 'w1', word: 'Feeling', start: 0, end: 1 }, { id: 'w2', word: 'dehydrated', start: 1, end: 2 }] },
        ],
      });

      const res = store.applyDictionaryReplacements(rules, true, 'original');
      assert.strictEqual(res.replacementsCount, 0);

      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].text, 'Feeling dehydrated');
    });

    it('28. preserves attached punctuation during replacement ("hyd," -> "Hyderabad,")', () => {
      const userId = 'user-test-24';
      saveDictionaryRule(userId, 'hyd', 'Hyderabad');
      const rules = getDictionaryRules(userId);

      const store = useEditorStore.getState();
      useEditorStore.setState({
        userId,
        subtitleMode: 'original',
        segments: [
          { id: 1, start: 0, end: 2, text: 'Welcome to hyd, Telangana', words: [{ id: 'w1', word: 'Welcome', start: 0, end: 0.5 }, { id: 'w2', word: 'to', start: 0.5, end: 1 }, { id: 'w3', word: 'hyd,', start: 1, end: 1.5 }, { id: 'w4', word: 'Telangana', start: 1.5, end: 2 }] },
        ],
        originalSegments: [
          { id: 1, start: 0, end: 2, text: 'Welcome to hyd, Telangana', words: [{ id: 'w1', word: 'Welcome', start: 0, end: 0.5 }, { id: 'w2', word: 'to', start: 0.5, end: 1 }, { id: 'w3', word: 'hyd,', start: 1, end: 1.5 }, { id: 'w4', word: 'Telangana', start: 1.5, end: 2 }] },
        ],
      });

      const res = store.applyDictionaryReplacements(rules, true, 'original');
      assert.strictEqual(res.replacementsCount, 1);

      const segs = useEditorStore.getState().segments;
      assert.strictEqual(segs[0].words[2].word, 'Hyderabad,');
    });
  });

  describe('6. Database & Error Classification Audits', () => {
    it('29. strictly classifies 42P01 and PGRST errors referencing exports table', () => {
      assert.strictEqual(isMissingExportsTableError({ code: '42P01', message: 'relation "public.exports" does not exist' }), true);
      assert.strictEqual(isMissingExportsTableError({ code: '42P01', message: 'relation "public.projects" does not exist' }), false);
      assert.strictEqual(isMissingExportsTableError({ code: 'PGRST204', message: 'Could not find column in schema cache' }), false);
      assert.strictEqual(isMissingExportsTableError({ code: 'PGRST205', message: 'Could not find table exports in schema cache' }), true);
      assert.strictEqual(isMissingExportsTableError({ code: 'PGRST205', message: 'Could not find table projects in schema cache' }), false);
    });

    it('30. deduplicates project fallback entries using project_id correctly', () => {
      const exportsItems: BaseExportItem[] = [
        { id: 'exp-1', projectId: 'proj-100', title: 'Export 1', createdAt: '2026-08-11', status: 'completed', downloadUrl: '/api/exports/exp-1/download', source: 'exports_table' },
      ];
      const projectItems: BaseExportItem[] = [
        { id: 'proj-100', projectId: 'proj-100', title: 'Project 100', createdAt: '2026-08-11', status: 'completed', downloadUrl: '/api/projects/proj-100/download', source: 'projects_fallback' },
        { id: 'proj-200', projectId: 'proj-200', title: 'Project 200', createdAt: '2026-08-11', status: 'completed', downloadUrl: '/api/projects/proj-200/download', source: 'projects_fallback' },
      ];

      const merged = mergeExportsAndProjects(exportsItems, projectItems);
      assert.strictEqual(merged.length, 2);
      assert.strictEqual(merged[0].id, 'exp-1');
      assert.strictEqual(merged[1].id, 'proj-200');
    });

    it('31. verifies template style resolution and formatting output', () => {
      const t = getTemplateById('kalakar-glow');
      assert.ok(t);
      const allTemplates = getAllTemplates();
      assert.ok(allTemplates.length >= 50);

      const srt = segmentsToSrt([{ id: 1, start: 1.0, end: 3.0, text: 'SRT test', words: [] }]);
      assert.ok(srt.includes('00:00:01,000 --> 00:00:03,000'));
    });
  });

  describe('7. Multilingual Resegmentation (autoSplit / autoLineBreak)', () => {
    it('32. autoSplitByWords correctly buckets words when a non-original mode is active', () => {

      const originalSegments = [
        { id: 1, start: 0, end: 6, text: 'one two three', words: [
          { id: 'w-o-1', word: 'one', start: 0, end: 2 },
          { id: 'w-o-2', word: 'two', start: 2, end: 4 },
          { id: 'w-o-3', word: 'three', start: 4, end: 6 }
        ]}
      ];
      const transliteratedSegments = [
        { id: 1, start: 0, end: 6, text: 'one word namaskaram', words: [
          { id: 'w-tr-1', word: 'one', start: 0, end: 2 },
          { id: 'w-tr-2', word: 'word', start: 2, end: 4 },
          { id: 'w-tr-3', word: 'namaskaram', start: 4, end: 6 }
        ]}
      ];
      const translatedSegments = [
        { id: 1, start: 0, end: 6, text: 'a b c d', words: [
          { id: 'w-tl-1', word: 'a', start: 0, end: 1.5 },
          { id: 'w-tl-2', word: 'b', start: 1.5, end: 3 },
          { id: 'w-tl-3', word: 'c', start: 3, end: 4.5 },
          { id: 'w-tl-4', word: 'd', start: 4.5, end: 6 }
        ]}
      ];

      useEditorStore.setState({
        subtitleMode: 'translated',
        originalSegments,
        transliteratedSegments,
        translatedSegments,
        segments: translatedSegments,
      });

      // Split active (translated) into 2 words per line
      useEditorStore.getState().autoSplitByWords(2);

      const state = useEditorStore.getState();
      
      // Translated should be 2 segments: "a b" and "c d"
      const act = state.translatedSegments;
      assert.strictEqual(act.length, 2);
      assert.strictEqual(act[0].text, 'a b');
      assert.strictEqual(act[1].text, 'c d');
      
      // Original should be bucketed into the new translated boundaries
      // Boundary 1: 0 to 3. Boundary 2: 3 to 6
      const orig = state.originalSegments;
      assert.strictEqual(orig.length, 2);
      assert.strictEqual(orig[0].text, 'one two'); // 'one' (0-2), 'two' (2-4). Wait, 'two' mid is 3. It overlaps both. 
      // Actually with maxOverlap, 'two' (2-4) overlaps act[0] (0-3) by 1s, act[1] (3-6) by 1s.
      // Ties go to the first, so 'two' goes to act[0].
      // 'three' (4-6) goes to act[1] (3-6).
      // So text should be 'one two' and 'three'.
      assert.strictEqual(orig[0].words.length, 2);
      assert.strictEqual(orig[1].text, 'three');

      // Transliterated should also be bucketed
      const trans = state.transliteratedSegments;
      assert.strictEqual(trans.length, 2);
      assert.strictEqual(trans[0].text, 'one word');
      assert.strictEqual(trans[1].text, 'namaskaram');
      
      // Check segment timings derived from words, not blindly copied
      assert.strictEqual(orig[0].start, 0);
      assert.strictEqual(orig[0].end, 4); // "two" ends at 4. (or 4.001 based on logic)
      
      assert.strictEqual(orig[1].start, 4);
      assert.strictEqual(orig[1].end, 6);
    });

    it('33. autoLineBreak works safely with non-original mode without phantom segments', () => {
      const originalSegments = [
        { id: 1, start: 0, end: 4, text: 'long sentence here', words: [
          { id: 'w-o-1', word: 'long', start: 0, end: 1 },
          { id: 'w-o-2', word: 'sentence', start: 1, end: 3 },
          { id: 'w-o-3', word: 'here', start: 3, end: 4 }
        ]}
      ];
      
      const translatedSegments = [
        { id: 1, start: 0, end: 4, text: 'long sentence here but much longer translation text', words: [
          { id: 'w-t-1', word: 'long', start: 0, end: 0.5 },
          { id: 'w-t-2', word: 'sentence', start: 0.5, end: 1.5 },
          { id: 'w-t-3', word: 'here', start: 1.5, end: 2 },
          { id: 'w-t-4', word: 'but', start: 2, end: 2.5 },
          { id: 'w-t-5', word: 'much', start: 2.5, end: 3 },
          { id: 'w-t-6', word: 'longer', start: 3, end: 3.5 },
          { id: 'w-t-7', word: 'translation', start: 3.5, end: 3.8 },
          { id: 'w-t-8', word: 'text', start: 3.8, end: 4 }
        ]}
      ];

      useEditorStore.setState({
        subtitleMode: 'translated',
        originalSegments,
        transliteratedSegments: [],
        translatedSegments,
        segments: translatedSegments,
        captionConfig: { maxWordsPerLine: 4, maxCharsPerLine: 50, linesLimit: 1, captionDelay: 0 }
      });

      useEditorStore.getState().autoLineBreak();
      const state = useEditorStore.getState();
      
      const act = state.translatedSegments;
      assert.strictEqual(act.length, 2); // 8 words split into 4 words each
      assert.strictEqual(act[0].text, 'long sentence here but');
      assert.strictEqual(act[1].text, 'much longer translation text');
      
      const orig = state.originalSegments;
      assert.ok(orig.length > 0);
      assert.strictEqual(orig[0].text, 'long sentence'); // w-o-1, w-o-2 (mid 2.0). act[0] ends at 2.5. So they go to act[0].
      assert.strictEqual(orig[1].text, 'here'); // w-o-3 (mid 3.5). goes to act[1] (starts 2.5).
      
      assert.ok(!orig.some(s => s.text === '...'));
    });
  });

  describe('8. Caption Spacing & Width Geometry', () => {
    it('getInterWordGap scales gap from base width and wordSpacing modifier without going negative', () => {
      assert.strictEqual(getInterWordGap(12, 0), 12);
      assert.strictEqual(getInterWordGap(12, 20), 32);
      assert.strictEqual(getInterWordGap(12, 74), 86);
      assert.strictEqual(getInterWordGap(12, -20), 0);
      assert.strictEqual(getInterWordGap(12, -5), 7);
    });

    it('composition GeometrySolver computes line width accurately with gaps and no trailing gap', () => {
      const words = [
        { id: 'w1', word: 'hello', start: 0, end: 1 },
        { id: 'w2', word: 'world', start: 1, end: 2 }
      ];
      // Simulated measurement: 10px per character
      const measureWord = (text: string) => text.length * 10;
      // "hello" = 50, "world" = 50
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preset = { parameters: { maxWordsPerLine: 2, maxCharactersPerLine: 20, safeAreaWidthRatio: 1.0 } } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = { containerWidth: 1000 } as any;
      
      const gap = 15;
      
      const lines = GeometrySolver.solve('b1', words, preset, context, measureWord, new Set(), gap);
      
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(lines[0].words.length, 2);
      // Width should be w1 (50) + gap (15) + w2 (50) = 115
      assert.strictEqual(lines[0].width, 115);
    });

    it('composition GeometrySolver wraps lines based on wordSpacing threshold', () => {
      const words = [
        { id: 'w1', word: 'hello', start: 0, end: 1 },
        { id: 'w2', word: 'world', start: 1, end: 2 }
      ];
      const measureWord = (text: string) => text.length * 10;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preset = { parameters: { maxWordsPerLine: 5, maxCharactersPerLine: 50, safeAreaWidthRatio: 1.0 } } as any;
      
      // containerWidth = 110
      // "hello" (50) + space + "world" (50) = 100 + space
      // If gap is 0, width is 100 <= 110, fits on 1 line.
      // If gap is 20, width is 120 > 110, breaks into 2 lines.
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = { containerWidth: 110 } as any;
      
      const linesSmallGap = GeometrySolver.solve('b1', words, preset, context, measureWord, new Set(), 0);
      assert.strictEqual(linesSmallGap.length, 1);
      
      const linesLargeGap = GeometrySolver.solve('b1', words, preset, context, measureWord, new Set(), 20);
      assert.strictEqual(linesLargeGap.length, 2);
    });

    it('composition cache invalidates when only wordSpacing changes', () => {
      const engine = new CaptionCompositionEngine();
      
      const style1 = ensureV3(DEFAULT_STYLE);
      style1.wordSpacing = 0;
      const style2 = ensureV3(DEFAULT_STYLE);
      style2.wordSpacing = 74;

      // We use containerWidth = 130. Safe area = 130 * 0.9 = 117.
      // measureWord returns length * 10. "hello" = 50, "world" = 50, space = 10.
      // Gap with wordSpacing 0 = 10. Total = 110 <= 117 (1 line).
      // Gap with wordSpacing 74 = 84. Total = 184 > 117 (2 lines).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = { containerWidth: 130, containerHeight: 1000, aspectRatio: '9:16', measureWord: (t: string) => t.length * 10 } as any;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segs = [{ id: 1, text: 'hello world', start: 0, end: 2, words: [ { id: 'w1', word: 'hello', start: 0, end: 1 }, { id: 'w2', word: 'world', start: 1, end: 2 } ] }] as any;
      
      const out1 = engine.compose(segs, style1, ctx, 'social_reels');
      const out2 = engine.compose(segs, style2, ctx, 'social_reels');
      
      assert.strictEqual(out1[0].lines.length, 1);
      assert.strictEqual(out2[0].lines.length, 2);
    });
  });
});
