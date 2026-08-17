import { create } from 'zustand';
import type { CaptionConfig } from '@/lib/subtitle-schema-v2';
import { DEFAULT_STYLE, DEFAULT_CAPTION_CONFIG } from '@/lib/subtitle-schema-v2';
import type { SubtitleStyleV3, WordStyleOverride, SegmentStyleOverride } from '@/lib/subtitle-schema-v3';
import { EMPTY_OVERRIDES, ensureV3 } from '@/lib/subtitle-schema-v3';
import { getTemplateById } from '@/lib/templates-data';
import { enrichTranscript, SemanticTag } from '@/lib/semantic-engine';
import { LayoutContext, CaptionBlock, CompositionDiagnostics, compositionEngine } from '@/lib/caption-composition';
import { measurementService } from '@/lib/measurement-service';
import { distributeSyntheticWords, normalizeUnicodeText } from '@/lib/srt-export';

// ─── Types ────────────────────────────────────────────────────────────

export interface RawWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface WaveformData {
  min: number[];
  max: number[];
  resolution: number;
}

export interface RawSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface Word {
  id: string;
  word: string;
  start: number;
  end: number;
  probability?: number;
  timingSource?: 'speech' | 'synthetic';
  style?: WordStyleOverride;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: Word[];
  style?: SegmentStyleOverride;
}

/** @deprecated Use SubtitleStyleV2/V3 from schema */
export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  alignment: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom';
  highlightMode: 'none' | 'color' | 'scale' | 'underline' | 'background' | 'karaoke';
}

export interface HistorySnapshot {
  segments: Segment[];
  originalSegments: Segment[];
  transliteratedSegments: Segment[];
  translatedSegments: Segment[];
  subtitleStyle: SubtitleStyleV3;
  captionConfig: CaptionConfig;
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
}

export interface DictionaryRule {
  id: string;
  search: string;
  replaceWith: string;
}

// ─── Helper Functions ───────────────────────────────────────────────

const getGlobalSnapshot = (state: EditorState): HistorySnapshot => ({
  segments: state.segments,
  originalSegments: state.originalSegments,
  transliteratedSegments: state.transliteratedSegments,
  translatedSegments: state.translatedSegments,
  subtitleStyle: state.subtitleStyle,
  captionConfig: state.captionConfig,
});

const getBackingUpdates = (state: EditorState, newActiveSegments: Segment[]): Partial<EditorState> => {
  const mode = state.subtitleMode;
  if (mode === 'original') return { originalSegments: newActiveSegments };
  if (mode === 'transliterated') return { transliteratedSegments: newActiveSegments };
  if (mode === 'translated') return { translatedSegments: newActiveSegments };
  return {};
};

const resegmentSync = (oldSegs: Segment[] | undefined, newCanonicalSegs: Segment[]): Segment[] => {
  if (!oldSegs || oldSegs.length === 0) return [];
  if (!newCanonicalSegs || newCanonicalSegs.length === 0) return [];

  const allWords = oldSegs.flatMap((s) => s.words).sort((a, b) => a.start - b.start);

  const buckets: { canonicalId: number; words: Word[] }[] = newCanonicalSegs.map((c) => ({
    canonicalId: c.id,
    words: [],
  }));

  for (const w of allWords) {
    const wMid = w.start + (w.end - w.start) / 2;

    let bestBucketIdx = -1;
    let maxOverlap = -1;
    let minDistance = Infinity;

    for (let i = 0; i < newCanonicalSegs.length; i++) {
      const c = newCanonicalSegs[i];
      const overlapStart = Math.max(w.start, c.start);
      const overlapEnd = Math.min(w.end, c.end);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > maxOverlap && overlap > 0) {
        maxOverlap = overlap;
        bestBucketIdx = i;
      }
    }

    if (bestBucketIdx === -1) {
      for (let i = 0; i < newCanonicalSegs.length; i++) {
        const c = newCanonicalSegs[i];
        const cMid = c.start + (c.end - c.start) / 2;
        const dist = Math.abs(wMid - cMid);
        if (dist < minDistance) {
          minDistance = dist;
          bestBucketIdx = i;
        }
      }
    }

    if (bestBucketIdx !== -1) {
      buckets[bestBucketIdx].words.push(w);
    }
  }

  const resultingSegs: Segment[] = [];

  for (const bucket of buckets) {
    if (bucket.words.length === 0) continue;

    bucket.words.sort((a, b) => a.start - b.start);

    const start = bucket.words[0].start;
    const end = Math.max(start + 0.001, bucket.words[bucket.words.length - 1].end);
    const text = bucket.words.map((w) => w.word.trim()).join(' ');

    resultingSegs.push({
      id: bucket.canonicalId,
      start,
      end,
      text,
      words: bucket.words,
    });
  }

  return resultingSegs;
};

// ─── State Interface ──────────────────────────────────────────────────

export interface EditorState {
  // Project data
  projectId: string | null;
  projectTitle: string;
  videoUrl: string | null;
  language: string;
  userId: string | null;

  // Transcript data
  segments: Segment[];
  originalSegments: Segment[];
  transliteratedSegments: Segment[];
  translatedSegments: Segment[];
  waveform?: WaveformData;
  subtitleMode: 'original' | 'transliterated' | 'translated';

  // Playback state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeSegmentIndex: number;

  // Semantic Enrichment
  semanticTags: Record<string, SemanticTag>;

  // Search
  searchQuery: string;

  // Subtitle styling
  subtitleStyle: SubtitleStyleV3;
  captionConfig: CaptionConfig;
  activeTemplateId: string | null;

  // UI state
  editMode: 'line' | 'word';
  timelineZoom: number;

  // History
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  // Composition Engine
  computedBlocks: CaptionBlock[];
  layoutContext: LayoutContext;
  activePreset: string;
  compositionDiagnostics: CompositionDiagnostics | null;
  useCompositionRenderer: boolean;
  manualOverrides: import('@/lib/caption-composition').ManualOverride[];

  // Mutators & Actions
  setUserId: (userId: string | null) => void;
  setLayoutContext: (context: Partial<LayoutContext>) => void;
  setActivePreset: (presetId: string) => void;
  setUseCompositionRenderer: (use: boolean) => void;
  addManualOverride: (override: import('@/lib/caption-composition').ManualOverride) => void;
  removeManualOverride: (beforeWordId: string, type: import('@/lib/caption-composition').ManualConstraint) => void;
  recomputeBlocks: (segmentIds?: number[]) => void;

  setProjectData: (data: { projectId: string; projectTitle: string; language: string }) => void;
  setVideoUrl: (url: string) => void;

  setTranscriptData: (
    rawSegments: RawSegment[],
    rawWords?: RawWord[],
    rawTranslitSegments?: RawSegment[],
    rawTranslitWords?: RawWord[],
    rawTransSegments?: RawSegment[],
    rawTransWords?: RawWord[],
    waveform?: WaveformData
  ) => void;

  setWaveform: (waveform: WaveformData) => void;
  setSubtitleMode: (mode: 'original' | 'transliterated' | 'translated') => void;

  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveSegmentIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setSubtitleStyle: (style: Partial<SubtitleStyleV3>) => void;
  setSubtitleStyleV2: (updater: (prev: SubtitleStyleV3) => SubtitleStyleV3) => void;
  setCaptionConfig: (config: Partial<CaptionConfig>) => void;
  applyTemplate: (templateId: string) => void;
  applyCreatorPreset: (presetId: string, version: number) => void;
  applyAiHighlighting: () => void;
  applyAiEmojis: () => void;
  setEditMode: (mode: 'line' | 'word') => void;
  setTimelineZoom: (zoom: number) => void;

  selectedWordIds: string[];
  toggleWordSelection: (wordId: string, multiSelect: boolean) => void;
  clearWordSelection: () => void;
  updateSelectedWordsStyle: (style: Partial<WordStyleOverride>) => void;
  updateSegmentStyle: (segmentId: number, style: Partial<SegmentStyleOverride>) => void;

  updateSegmentText: (id: number, text: string) => void;
  updateSegmentTiming: (id: number, start: number, end: number) => void;
  updateWordText: (segId: number, wordId: string, newWord: string) => void;
  splitSegment: (id: number, splitTime: number) => void;
  mergeSegments: (id: number) => void;
  deleteSegment: (id: number) => void;

  autoLineBreak: (maxChars?: number) => void;
  autoSplitByWords: (maxWords: number) => void;
  removeFillers: () => void;
  removePunctuation: () => void;
  removeEmojis: () => void;
  restoreEmphasis: () => void;
  removeGaps: () => void;
  replaceText: (search: string, replaceWith: string, replaceAll: boolean, segId?: number) => void;

  importSubtitleSegments: (mode: 'original' | 'transliterated' | 'translated', rawCues: Array<{ start: number; end: number; text: string }>) => void;
  applyDictionaryReplacements: (rules: DictionaryRule[], applyAll: boolean, targetMode?: 'original' | 'transliterated' | 'translated') => { replacementsCount: number };

  validateTimingModel: () => ValidationReport;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const defaultSubtitleStyle: SubtitleStyleV3 = { ...DEFAULT_STYLE, _version: 3, overrides: EMPTY_OVERRIDES };

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  projectTitle: '',
  videoUrl: null,
  language: '',
  userId: null,

  computedBlocks: [],
  layoutContext: {
    containerWidth: 0,
    containerHeight: 0,
    safeArea: 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    scaleFactor: 1,
    aspectRatio: 16 / 9,
    exportMode: false,
  },
  activePreset: 'social_reels',
  compositionDiagnostics: null,
  useCompositionRenderer: true,
  manualOverrides: [],

  segments: [],
  originalSegments: [],
  transliteratedSegments: [],
  translatedSegments: [],
  waveform: undefined,
  subtitleMode: 'original',

  currentTime: 0,
  duration: 0,
  isPlaying: false,
  activeSegmentIndex: -1,

  searchQuery: '',
  semanticTags: {},

  subtitleStyle: defaultSubtitleStyle,
  captionConfig: { ...DEFAULT_CAPTION_CONFIG },
  activeTemplateId: null,

  editMode: 'line',
  timelineZoom: 80,
  selectedWordIds: [],

  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setUserId: (userId) => set({ userId }),

  setLayoutContext: (context) => {
    set((state) => ({ layoutContext: { ...state.layoutContext, ...context } }));
    get().recomputeBlocks();
  },

  setActivePreset: (presetId) => {
    set({ activePreset: presetId });
    get().recomputeBlocks();
  },

  setUseCompositionRenderer: (use) => set({ useCompositionRenderer: use }),

  addManualOverride: (override) => {
    set((state) => {
      const filtered = state.manualOverrides.filter(
        (o) => !(o.layoutProfileId === override.layoutProfileId && o.beforeWordId === override.beforeWordId && o.type === override.type)
      );
      return { manualOverrides: [...filtered, override] };
    });
    get().recomputeBlocks();
  },

  removeManualOverride: (beforeWordId, type) => {
    set((state) => ({
      manualOverrides: state.manualOverrides.filter(
        (o) => !(o.beforeWordId === beforeWordId && o.type === type)
      ),
    }));
    get().recomputeBlocks();
  },

  recomputeBlocks: () => {
    const state = get();
    const fontStr = `${state.subtitleStyle.font.weight} ${state.subtitleStyle.fontSize}px "${state.subtitleStyle.font.family}"`;

    const composeAndSet = () => {
      const t0 = performance.now();
      const segmentsToUse = state.segments;
      const enrichedContext = {
        ...state.layoutContext,
        measureWord: (word: string) => {
          const baseWidth = measurementService.measureWidth({
            text: word,
            fontFamily: state.subtitleStyle.font.family,
            fontSize: state.subtitleStyle.fontSize,
            fontWeight: state.subtitleStyle.font.weight as number,
            letterSpacing: state.subtitleStyle.letterSpacing,
          });

          if (state.subtitleStyle.highlightMode === 'background') {
            return baseWidth + 16; // 8px left + 8px right
          }
          return baseWidth;
        },
      };

      const layoutProfileId = `${state.activePreset}-${state.layoutContext.aspectRatio}`;
      const activeOverrides = state.manualOverrides.filter((o) => o.layoutProfileId === layoutProfileId);

      const blocks = compositionEngine.compose(
        segmentsToUse,
        state.subtitleStyle,
        enrichedContext,
        state.activePreset,
        activeOverrides
      );
      const t1 = performance.now();

      set({
        computedBlocks: blocks,
        compositionDiagnostics: {
          composeTimeMs: t1 - t0,
          measureTimeMs: compositionEngine.diagnostics.measureTimeMs,
          phraseDetectionMs: compositionEngine.diagnostics.phraseDetectionMs,
          timingSegmentationMs: compositionEngine.diagnostics.timingSegmentationMs,
          geometryMs: compositionEngine.diagnostics.geometryMs,
          visualBalanceMs: compositionEngine.diagnostics.visualBalanceMs,
          readingSpeedMs: compositionEngine.diagnostics.readingSpeedMs,
          validationMs: compositionEngine.diagnostics.validationMs,
          cacheHits: compositionEngine.diagnostics.cacheHits,
          cacheMisses: compositionEngine.diagnostics.cacheMisses,
          totalWords: segmentsToUse.reduce((acc, s) => acc + s.words.length, 0),
          measuredWords: 0,
          layoutVersion: blocks[0]?.layoutVersion || 1,
          preset: state.activePreset,
        },
      });
    };

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.load(fontStr).then(() => {
        composeAndSet();
      });
    } else {
      composeAndSet();
    }
  },

  setProjectData: ({ projectId, projectTitle, language }) => set({ projectId, projectTitle, language }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),

  setTranscriptData: (
    rawSegments,
    rawWords = [],
    rawTranslitSegments = [],
    rawTranslitWords = [],
    rawTransSegments = [],
    rawTransWords = [],
    waveform
  ) => {
    const mapHierarchical = (
      segs: RawSegment[] = [],
      wrds: RawWord[] = [],
      mode: 'original' | 'transliterated' | 'translated' = 'original'
    ) => {
      const sortedWrds = [...wrds].sort((a, b) => a.start - b.start);
      return segs.map((seg) => {
        const s = seg.start;
        const e = Math.max(s + 0.1, seg.end);
        let ownedWords = sortedWrds
          .filter((w) => w.start >= s && w.end <= e)
          .map((w, i) => ({ ...w, id: `w-${mode}-seg-${seg.id}-${i}` }));

        const tokens = seg.text.trim().split(/\s+/).filter(Boolean);
        if ((ownedWords.length === 0 || ownedWords.length !== tokens.length) && tokens.length > 0) {
          ownedWords = distributeSyntheticWords(seg.text, s, e, seg.id, mode);
        }

        return {
          ...seg,
          start: s,
          end: e,
          words: ownedWords,
        };
      });
    };

    const originalSegments = mapHierarchical(rawSegments, rawWords, 'original');
    const transliteratedSegments = mapHierarchical(rawTranslitSegments || [], rawTranslitWords || [], 'transliterated');
    const translatedSegments = mapHierarchical(rawTransSegments || [], rawTransWords || [], 'translated');

    set({
      originalSegments,
      transliteratedSegments,
      translatedSegments,
      segments: originalSegments,
      waveform: waveform || undefined,
      subtitleMode: 'original',
      semanticTags: enrichTranscript(originalSegments.flatMap((s) => s.words)),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });

    const hasMassiveBlocks = originalSegments.some((seg) => seg.end - seg.start > 15 || seg.words.length > 20);
    if (hasMassiveBlocks) {
      get().autoLineBreak();
      set({ past: [], future: [], canUndo: false, canRedo: false });
    }
  },

  setWaveform: (waveform) => set({ waveform }),

  setSubtitleMode: (subtitleMode) =>
    set((state) => {
      const backingUpdates: Partial<EditorState> = {};
      if (state.subtitleMode === 'original') backingUpdates.originalSegments = state.segments;
      else if (state.subtitleMode === 'transliterated') backingUpdates.transliteratedSegments = state.segments;
      else if (state.subtitleMode === 'translated') backingUpdates.translatedSegments = state.segments;

      let targetSegments = state.originalSegments;
      if (subtitleMode === 'transliterated') targetSegments = state.transliteratedSegments;
      else if (subtitleMode === 'translated') targetSegments = state.translatedSegments;

      return {
        ...backingUpdates,
        subtitleMode,
        segments: targetSegments,
      };
    }),

  setCurrentTime: (currentTime) =>
    set((state) => {
      const activeIdx = state.segments.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
      return {
        currentTime,
        activeSegmentIndex: activeIdx,
      };
    }),

  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setActiveSegmentIndex: (activeSegmentIndex) => set({ activeSegmentIndex }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSubtitleStyle: (partial) =>
    set((state) => ({
      subtitleStyle: { ...state.subtitleStyle, ...partial } as SubtitleStyleV3,
    })),

  setSubtitleStyleV2: (updater) =>
    set((state) => {
      const snapshot = getGlobalSnapshot(state);
      return {
        subtitleStyle: updater(state.subtitleStyle),
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  setCaptionConfig: (partial) =>
    set((state) => ({
      captionConfig: { ...state.captionConfig, ...partial },
    })),

  applyTemplate: (templateId) =>
    set((state) => {
      const template = getTemplateById(templateId);
      if (!template) return {};
      const snapshot = getGlobalSnapshot(state);
      return {
        subtitleStyle: {
          ...ensureV3(template.style),
          positionX: state.subtitleStyle.positionX,
          positionY: state.subtitleStyle.positionY,
        },
        activeTemplateId: templateId,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  applyCreatorPreset: (presetId, version) =>
    set((state) => {
      const snapshot = getGlobalSnapshot(state);
      const style = { ...state.subtitleStyle };

      if (presetId === 'hyperframes-climax') {
        style.font = { family: 'Noto Serif Telugu', weight: 800, italic: false };
        style.textColor = { type: 'solid', solid: '#ffffff' };
        style.activeWordColor = '#FACC15';
        style.highlightMode = 'karaoke';
        style.fontSize = 44;
        style.glow = { enabled: true, color: 'rgba(250, 204, 21, 0.75)', radius: 24 };
        style.transition = { type: 'scale', target: 'word', duration: 0.2 };
        style.shadow = { color: 'rgba(0, 0, 0, 0.95)', offsetX: 0, offsetY: 4, blur: 20 };
        style.stroke = { enabled: true, color: '#000000', width: 2 };
        style.background = { enabled: true, color: 'rgba(0, 0, 0, 0.65)' };
      } else if (presetId === 'hyperframes-rail') {
        style.font = { family: 'Noto Sans Telugu', weight: 700, italic: false };
        style.textColor = { type: 'solid', solid: 'rgba(255, 255, 255, 0.6)' };
        style.activeWordColor = '#38BDF8';
        style.highlightMode = 'karaoke';
        style.fontSize = 40;
        style.glow = { enabled: true, color: 'rgba(56, 189, 248, 0.85)', radius: 20 };
        style.transition = { type: 'pop', target: 'word', duration: 0.15 };
        style.shadow = { color: 'rgba(0, 0, 0, 0.85)', offsetX: 0, offsetY: 2, blur: 12 };
        style.stroke = { enabled: true, color: '#000000', width: 2 };
        style.background = { enabled: true, color: 'rgba(15, 15, 20, 0.75)' };
      } else if (presetId === 'hormozi') {
        style.font = { family: 'Montserrat', weight: 900, italic: false };
        style.textTransform = 'uppercase';
        style.textColor = { type: 'solid', solid: '#ffffff' };
        style.activeWordColor = '#FFEA00';
        style.highlightMode = 'color';
        style.fontSize = 46;
        style.stroke = { enabled: true, color: '#000000', width: 4 };
        style.shadow = { color: 'rgba(0, 0, 0, 0.9)', offsetX: 0, offsetY: 4, blur: 10 };
        style.transition = { type: 'pop', target: 'word', duration: 0.15 };
      } else if (presetId === 'ali') {
        style.font = { family: 'Outfit', weight: 600, italic: false };
        style.textColor = { type: 'solid', solid: 'rgba(255, 255, 255, 0.7)' };
        style.activeWordColor = '#4DB8FF';
        style.highlightMode = 'color';
        style.fontSize = 40;
        style.background = { enabled: true, color: 'rgba(0, 0, 0, 0.5)' };
        style.transition = { type: 'fade', target: 'word', duration: 0.2 };
      } else if (presetId === 'iman') {
        style.font = { family: 'Space Grotesk', weight: 500, italic: false };
        style.textColor = { type: 'solid', solid: '#808080' };
        style.activeWordColor = '#FFFFFF';
        style.highlightMode = 'color';
        style.fontSize = 42;
        style.glow = { enabled: true, color: '#FFFFFF', radius: 18 };
        style.transition = { type: 'fade', target: 'word', duration: 0.25 };
      } else if (presetId === 'dev') {
        style.font = { family: 'Bebas Neue', weight: 400, italic: false };
        style.textTransform = 'uppercase';
        style.textColor = { type: 'solid', solid: '#ffffff' };
        style.activeWordColor = '#FF9933';
        style.highlightMode = 'scale';
        style.fontSize = 48;
        style.stroke = { enabled: true, color: '#000000', width: 3 };
        style.transition = { type: 'scale', target: 'word', duration: 0.15 };
      }

      style.activePreset = { id: presetId, version };

      return {
        subtitleStyle: style,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  applyAiHighlighting: () =>
    set((state) => {
      const newOverrides = { ...state.subtitleStyle.overrides };
      newOverrides.wordStyles = { ...newOverrides.wordStyles };
      let hasChanges = false;

      Object.entries(state.semanticTags).forEach(([wordId, tag]) => {
        if (tag.suggestedColor) {
          newOverrides.wordStyles[wordId] = {
            ...(newOverrides.wordStyles[wordId] || {}),
            textColor: tag.suggestedColor,
          };
          hasChanges = true;
        }
      });

      if (!hasChanges) return {};

      const snapshot = getGlobalSnapshot(state);
      return {
        subtitleStyle: { ...state.subtitleStyle, overrides: newOverrides },
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  applyAiEmojis: () =>
    set((state) => {
      const newOverrides = { ...state.subtitleStyle.overrides };
      newOverrides.wordStyles = { ...newOverrides.wordStyles };
      let hasChanges = false;

      Object.entries(state.semanticTags).forEach(([wordId, tag]) => {
        if (tag.suggestedEmoji) {
          newOverrides.wordStyles[wordId] = {
            ...(newOverrides.wordStyles[wordId] || {}),
            emoji: tag.suggestedEmoji,
          };
          hasChanges = true;
        }
      });

      if (!hasChanges) return {};

      const snapshot = getGlobalSnapshot(state);
      return {
        subtitleStyle: { ...state.subtitleStyle, overrides: newOverrides },
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  setEditMode: (editMode) => set({ editMode }),
  setTimelineZoom: (timelineZoom) => set({ timelineZoom }),

  toggleWordSelection: (wordId, multiSelect) =>
    set((state) => {
      let next: string[];
      if (multiSelect) {
        if (state.selectedWordIds.includes(wordId)) {
          next = state.selectedWordIds.filter((id) => id !== wordId);
        } else {
          next = [...state.selectedWordIds, wordId];
        }
      } else {
        next = state.selectedWordIds.includes(wordId) && state.selectedWordIds.length === 1 ? [] : [wordId];
      }
      return { selectedWordIds: next };
    }),

  clearWordSelection: () => set({ selectedWordIds: [] }),

  updateSelectedWordsStyle: (style) =>
    set((state) => {
      if (state.selectedWordIds.length === 0) return {};
      const newOverrides = { ...state.subtitleStyle.overrides };
      newOverrides.wordStyles = { ...newOverrides.wordStyles };

      for (const wordId of state.selectedWordIds) {
        newOverrides.wordStyles[wordId] = {
          ...(newOverrides.wordStyles[wordId] || {}),
          ...style,
        };
      }

      return {
        subtitleStyle: {
          ...state.subtitleStyle,
          overrides: newOverrides,
        },
      };
    }),

  updateSegmentStyle: (segmentId, style) =>
    set((state) => {
      const newOverrides = { ...state.subtitleStyle.overrides };
      newOverrides.segmentStyles = { ...newOverrides.segmentStyles };

      newOverrides.segmentStyles[segmentId] = {
        ...(newOverrides.segmentStyles[segmentId] || {}),
        ...style,
      };

      return {
        subtitleStyle: {
          ...state.subtitleStyle,
          overrides: newOverrides,
        },
      };
    }),

  updateSegmentText: (id, text) =>
    set((state) => {
      let textModified = false;
      const newSegments = state.segments.map((seg) => {
        if (seg.id !== id) return seg;
        if (seg.text.trim() === text.trim()) return seg;
        textModified = true;

        const newWordTokens = text.trim().split(/\s+/).filter(Boolean);
        let newWords: Word[] = [];

        if (newWordTokens.length === seg.words.length) {
          newWords = newWordTokens.map((token, i) => ({
            ...seg.words[i],
            word: token,
          }));
        } else {
          const duration = Math.max(0.01, seg.end - seg.start);
          const wordDuration = duration / Math.max(1, newWordTokens.length);

          newWords = newWordTokens.map((token, i) => {
            const existingWord = seg.words[i];
            const uniqueId = `w-seg-${seg.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
            return {
              id: existingWord ? existingWord.id : uniqueId,
              word: token,
              start: seg.start + i * wordDuration,
              end: seg.start + (i + 1) * wordDuration,
              timingSource: 'synthetic' as const,
            };
          });
        }

        return { ...seg, text, words: newWords };
      });

      if (!textModified) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  updateSegmentTiming: (id, start, end) =>
    set((state) => {
      const updateTimingForSegments = (segs: Segment[]) => {
        return segs.map((seg) => {
          if (seg.id === id) {
            const snappedStart = Math.max(0, Math.round(start * 10) / 10);
            const snappedEnd = Math.max(snappedStart + 0.1, Math.round(end * 10) / 10);
            const delta = snappedStart - seg.start;

            const newWords = seg.words.map((w) => ({
              ...w,
              start: Math.max(0, w.start + delta),
              end: Math.max(0.1, w.end + delta),
            }));

            return { ...seg, start: snappedStart, end: snappedEnd, words: newWords };
          }
          return seg;
        });
      };

      const newSegments = updateTimingForSegments(state.segments);
      const newOriginal = updateTimingForSegments(state.originalSegments);
      const newTranslit = updateTimingForSegments(state.transliteratedSegments);
      const newTranslated = updateTimingForSegments(state.translatedSegments);

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  updateWordText: (segId, wordId, newWordText) =>
    set((state) => {
      let wordModified = false;
      const newSegments = state.segments.map((seg) => {
        if (seg.id !== segId) return seg;

        const newWords = seg.words.flatMap((w) => {
          if (w.id !== wordId) return [w];
          wordModified = true;

          const trimmed = newWordText.trim();
          if (!trimmed) return [];

          const tokens = trimmed.split(/\s+/);
          if (tokens.length === 1) {
            return [{ ...w, word: newWordText }];
          }

          const duration = w.end - w.start;
          const step = duration / tokens.length;

          return tokens.map((token, idx) => {
            const isFirst = idx === 0;
            const leadingSpace = isFirst ? (newWordText.match(/^\s*/) || [''])[0] : '';
            const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`;
            return {
              ...w,
              id: isFirst ? w.id : `w-seg-${segId}-${uniqueSuffix}`,
              word: leadingSpace + token,
              start: w.start + idx * step,
              end: w.start + (idx + 1) * step,
              timingSource: 'synthetic' as const,
            };
          });
        });

        const newText = newWords.map((w) => w.word.trim()).join(' ');
        return { ...seg, text: newText, words: newWords };
      });

      if (!wordModified) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  splitSegment: (id, splitTime) =>
    set((state) => {
      const idx = state.segments.findIndex((s) => s.id === id);
      if (idx === -1) return {};
      const seg = state.segments[idx];
      if (splitTime <= seg.start || splitTime >= seg.end) return {};

      const newSegBId = Math.max(
        0,
        ...state.segments.map((s) => s.id),
        ...state.originalSegments.map((s) => s.id),
        ...state.transliteratedSegments.map((s) => s.id),
        ...state.translatedSegments.map((s) => s.id)
      ) + 1;

      const splitHelper = (segs: Segment[]) => {
        const targetIdx = segs.findIndex((s) => s.id === id);
        if (targetIdx === -1) return segs;
        const targetSeg = segs[targetIdx];

        const splitIdx = targetSeg.words.findIndex((w) => w.start >= splitTime);
        const wordsA = splitIdx === -1 ? [...targetSeg.words] : targetSeg.words.slice(0, splitIdx);
        const wordsB = splitIdx === -1 ? [] : targetSeg.words.slice(splitIdx);

        const textA = wordsA.map((w) => w.word.trim()).join(' ');
        const textB = wordsB.map((w) => w.word.trim()).join(' ');

        const endA = wordsA.length > 0 ? wordsA[wordsA.length - 1].end : splitTime;
        const startB = wordsB.length > 0 ? wordsB[0].start : splitTime;

        const newSegA: Segment = {
          id: targetSeg.id,
          start: targetSeg.start,
          end: endA,
          text: textA || '...',
          words: wordsA,
        };
        const newSegB: Segment = {
          id: newSegBId,
          start: startB,
          end: targetSeg.end,
          text: textB || '...',
          words: wordsB,
        };

        const res = [...segs];
        res.splice(targetIdx, 1, newSegA, newSegB);
        return res;
      };

      const newOriginal = splitHelper(state.originalSegments);
      const newTranslit = splitHelper(state.transliteratedSegments);
      const newTranslated = splitHelper(state.translatedSegments);

      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  mergeSegments: (id) =>
    set((state) => {
      const mergeHelper = (segs: Segment[]) => {
        const targetIdx = segs.findIndex((s) => s.id === id);
        if (targetIdx === -1 || targetIdx === segs.length - 1) return segs;

        const segA = segs[targetIdx];
        const segB = segs[targetIdx + 1];

        const mergedSeg: Segment = {
          id: segA.id,
          start: segA.start,
          end: segB.end,
          text: `${segA.text} ${segB.text}`.trim(),
          words: [...segA.words, ...segB.words],
        };

        const res = [...segs];
        res.splice(targetIdx, 2, mergedSeg);
        return res;
      };

      const newOriginal = mergeHelper(state.originalSegments);
      const newTranslit = mergeHelper(state.transliteratedSegments);
      const newTranslated = mergeHelper(state.translatedSegments);

      if (newOriginal === state.originalSegments && newTranslit === state.transliteratedSegments && newTranslated === state.translatedSegments) {
        return {};
      }

      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  deleteSegment: (id) =>
    set((state) => {
      const deleteHelper = (segs: Segment[]) => segs.filter((s) => s.id !== id);

      const newSegments = deleteHelper(state.segments);
      const newOriginal = deleteHelper(state.originalSegments);
      const newTranslit = deleteHelper(state.transliteratedSegments);
      const newTranslated = deleteHelper(state.translatedSegments);

      if (newSegments.length === state.segments.length) return {};

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  autoLineBreak: (maxChars) =>
    set((state) => {
      const limit = maxChars ?? state.captionConfig.maxCharsPerLine ?? 24;
      const maxWords = state.captionConfig.maxWordsPerLine ?? 0;

      const activeWords = [...state.segments.flatMap((s) => s.words)].sort((a, b) => a.start - b.start);
      if (activeWords.length === 0) return {};

      const groups: Word[][] = [];
      let currentGroup: Word[] = [];
      let currentText = '';

      for (let i = 0; i < activeWords.length; i++) {
        const w = activeWords[i];
        const wordText = w.word.trim();
        if (!wordText) continue;

        const space = currentText.length > 0 ? ' ' : '';
        const potentialText = currentText + space + wordText;

        const isCharLimitExceeded = potentialText.length > limit;
        const isWordLimitExceeded = maxWords > 0 && currentGroup.length >= maxWords;

        if ((isCharLimitExceeded || isWordLimitExceeded) && currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [w];
          currentText = wordText;
        } else {
          currentGroup.push(w);
          currentText = potentialText;
        }

        if (/[.!?]$/.test(wordText) && currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentText = '';
        }
      }
      if (currentGroup.length > 0) groups.push(currentGroup);

      let segId = 1;
      const newActiveSegments: Segment[] = groups.map((groupWords) => {
        const start = groupWords[0]?.start || 0;
        const end = Math.max(start + 0.1, groupWords[groupWords.length - 1]?.end || 0.1);
        return {
          id: segId++,
          start,
          end,
          text: groupWords.map((w) => w.word.trim()).join(' '),
          words: groupWords,
        };
      });

      const mode = state.subtitleMode;
      const newOriginal = mode === 'original' ? newActiveSegments : resegmentSync(state.originalSegments, newActiveSegments);
      const newTranslit = mode === 'transliterated' ? newActiveSegments : resegmentSync(state.transliteratedSegments, newActiveSegments);
      const newTranslated = mode === 'translated' ? newActiveSegments : resegmentSync(state.translatedSegments, newActiveSegments);

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newActiveSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  autoSplitByWords: (maxWords) =>
    set((state) => {
      const activeWords = [...state.segments.flatMap((s) => s.words)].sort((a, b) => a.start - b.start);
      if (activeWords.length === 0) return {};

      const groups: Word[][] = [];
      let currentGroup: Word[] = [];

      for (let i = 0; i < activeWords.length; i++) {
        const w = activeWords[i];
        if (!w.word.trim()) continue;

        if (currentGroup.length >= maxWords && currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [w];
        } else {
          currentGroup.push(w);
        }

        if (/[.!?]$/.test(w.word.trim()) && currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
      }
      if (currentGroup.length > 0) groups.push(currentGroup);

      let segId = 1;
      const newActiveSegments: Segment[] = groups.map((groupWords) => {
        const start = groupWords[0]?.start || 0;
        const end = Math.max(start + 0.1, groupWords[groupWords.length - 1]?.end || 0.1);
        return {
          id: segId++,
          start,
          end,
          text: groupWords.map((w) => w.word.trim()).join(' '),
          words: groupWords,
        };
      });

      const mode = state.subtitleMode;
      const newOriginal = mode === 'original' ? newActiveSegments : resegmentSync(state.originalSegments, newActiveSegments);
      const newTranslit = mode === 'transliterated' ? newActiveSegments : resegmentSync(state.transliteratedSegments, newActiveSegments);
      const newTranslated = mode === 'translated' ? newActiveSegments : resegmentSync(state.translatedSegments, newActiveSegments);

      const snapshot = getGlobalSnapshot(state);

      return {
        captionConfig: { ...state.captionConfig, maxWordsPerLine: maxWords },
        segments: newActiveSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  removeFillers: () =>
    set((state) => {
      const singleFillers = new Set(['um', 'uh', 'like', 'so', 'hmm', 'ah']);
      let changed = false;

      const newSegments = state.segments
        .map((seg) => {
          if (seg.words.length === 0) return seg;

          const filteredWords: Word[] = [];
          let i = 0;
          while (i < seg.words.length) {
            const w = seg.words[i];
            const clean = w.word.toLowerCase().replace(/[^a-z]/g, '').trim();

            if (i < seg.words.length - 1) {
              const nextW = seg.words[i + 1];
              const cleanNext = nextW.word.toLowerCase().replace(/[^a-z]/g, '').trim();
              if (clean === 'you' && cleanNext === 'know') {
                changed = true;
                i += 2;
                continue;
              }
            }

            if (singleFillers.has(clean)) {
              changed = true;
              i++;
              continue;
            }

            filteredWords.push(w);
            i++;
          }

          return {
            ...seg,
            text: filteredWords.map((w) => w.word.trim()).join(' '),
            words: filteredWords,
          };
        })
        .filter((seg) => seg.words.length > 0 || seg.text.length > 0);

      if (!changed) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  removePunctuation: () =>
    set((state) => {
      let changed = false;
      const newSegments = state.segments.map((seg) => {
        if (seg.words.length === 0) {
          const cleanText = seg.text.replace(/[.,!?;:'"()[\]{}]/g, '');
          if (cleanText !== seg.text) changed = true;
          return { ...seg, text: cleanText };
        }

        const newWords = seg.words.map((w) => {
          const clean = w.word.replace(/[.,!?;:'"()[\]{}]/g, '');
          if (clean !== w.word) changed = true;
          return { ...w, word: clean };
        });

        return {
          ...seg,
          text: newWords.map((w) => w.word.trim()).join(' '),
          words: newWords,
        };
      });

      if (!changed) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  removeEmojis: () =>
    set((state) => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
      let changed = false;

      const newSegments = state.segments
        .map((seg) => {
          if (seg.words.length === 0) {
            const cleanText = seg.text.replace(emojiRegex, '').trim();
            if (cleanText !== seg.text) changed = true;
            return { ...seg, text: cleanText };
          }
          const newWords = seg.words
            .map((w) => {
              const clean = w.word.replace(emojiRegex, '').trim();
              if (clean !== w.word) changed = true;
              return { ...w, word: clean };
            })
            .filter((w) => w.word.length > 0);

          return {
            ...seg,
            text: newWords.map((w) => w.word.trim()).join(' '),
            words: newWords,
          };
        })
        .filter((seg) => seg.words.length > 0 || seg.text.length > 0);

      if (!changed) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  restoreEmphasis: () =>
    set((state) => {
      let changed = false;
      const newSegments = state.segments.map((seg) => {
        if (seg.words.length === 0) return seg;
        const newWords = seg.words.map((w, i) => {
          if (i === 0) {
            const capitalized = w.word.charAt(0).toUpperCase() + w.word.slice(1);
            if (capitalized !== w.word) changed = true;
            return { ...w, word: capitalized };
          }
          return w;
        });

        return {
          ...seg,
          text: newWords.map((w) => w.word.trim()).join(' '),
          words: newWords,
        };
      });

      if (!changed) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  removeGaps: () =>
    set((state) => {
      let anyGapShifted = false;

      const removeGapsHelper = (segs: Segment[]) => {
        if (segs.length <= 1) return segs;
        const result: Segment[] = [];
        result.push(segs[0]);

        for (let i = 1; i < segs.length; i++) {
          const seg = segs[i];
          const prev = result[i - 1];
          if (seg.start > prev.end) {
            anyGapShifted = true;
            const delta = seg.start - prev.end;
            const newSegStart = prev.end;
            const newSegEnd = Math.max(newSegStart + 0.05, seg.end - delta);

            const newWords = seg.words.map((w, wIdx) => {
              const duration = Math.max(0.001, w.end - w.start);
              const wordStart = Math.max(newSegStart, w.start - delta);
              const wordEnd = wIdx === seg.words.length - 1 ? newSegEnd : Math.min(newSegEnd, wordStart + duration);

              return {
                ...w,
                start: wordStart,
                end: Math.max(wordStart + 0.0001, wordEnd),
              };
            });

            result.push({
              ...seg,
              start: newSegStart,
              end: newSegEnd,
              words: newWords,
            });
          } else {
            result.push(seg);
          }
        }
        return result;
      };

      const newOriginal = removeGapsHelper(state.originalSegments);
      const newTranslit = removeGapsHelper(state.transliteratedSegments);
      const newTranslated = removeGapsHelper(state.translatedSegments);

      if (!anyGapShifted) return {};

      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  replaceText: (search, replaceWith, replaceAll, segId) =>
    set((state) => {
      if (!search) return {};

      let replacedCount = 0;
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegExp(search), replaceAll ? 'gi' : 'i');

      const newSegments = state.segments.map((seg) => {
        if (segId !== undefined && seg.id !== segId) return seg;
        if (!replaceAll && replacedCount > 0) return seg;

        let segTextReplaced = false;
        let newWords = seg.words;
        let newText = seg.text;

        if (seg.words.length > 0) {
          newWords = seg.words.map((w) => {
            if (!replaceAll && replacedCount > 0) return w;

            if (regex.test(w.word)) {
              regex.lastIndex = 0;
              const newWordStr = w.word.replace(regex, replaceWith);
              if (w.word !== newWordStr) {
                replacedCount++;
                segTextReplaced = true;
                return { ...w, word: newWordStr };
              }
            }
            return w;
          });
          newText = newWords.map((w) => w.word.trim()).join(' ');
        } else {
          if (regex.test(seg.text)) {
            regex.lastIndex = 0;
            const newTextStr = seg.text.replace(regex, replaceWith);
            if (seg.text !== newTextStr) {
              replacedCount++;
              segTextReplaced = true;
              newText = newTextStr;
            }
          }
        }

        if (segTextReplaced) {
          return {
            ...seg,
            text: newText,
            words: newWords,
          };
        }
        return seg;
      });

      if (replacedCount === 0) return {};

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getGlobalSnapshot(state);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  importSubtitleSegments: (mode, rawCues) =>
    set((state) => {
      if (!rawCues || rawCues.length === 0) return {};

      const sortedCues = [...rawCues].sort((a, b) => a.start - b.start);

      const maxSegId = Math.max(
        0,
        ...state.segments.map((s) => s.id),
        ...state.originalSegments.map((s) => s.id),
        ...state.transliteratedSegments.map((s) => s.id),
        ...state.translatedSegments.map((s) => s.id)
      );

      let currentSegId = maxSegId + 1;

      const newImportedSegments: Segment[] = sortedCues.map((cue) => {
        const segId = currentSegId++;
        const words = distributeSyntheticWords(cue.text, cue.start, cue.end, segId, mode);
        return {
          id: segId,
          start: cue.start,
          end: cue.end,
          text: cue.text.trim(),
          words,
        };
      });

      const snapshot = getGlobalSnapshot(state);

      const updates: Partial<EditorState> = {
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };

      if (mode === 'original') {
        updates.originalSegments = newImportedSegments;
        if (state.subtitleMode === 'original') updates.segments = newImportedSegments;
      } else if (mode === 'transliterated') {
        updates.transliteratedSegments = newImportedSegments;
        if (state.subtitleMode === 'transliterated') updates.segments = newImportedSegments;
      } else if (mode === 'translated') {
        updates.translatedSegments = newImportedSegments;
        if (state.subtitleMode === 'translated') updates.segments = newImportedSegments;
      }

      return updates;
    }),

  applyDictionaryReplacements: (rules, applyAll, targetMode) => {
    let replacementsCount = 0;
    const state = get();
    if (!rules || rules.length === 0) return { replacementsCount: 0 };

    const modeToApply = targetMode || state.subtitleMode;
    let targetSegments = state.segments;
    if (modeToApply === 'original') targetSegments = state.originalSegments;
    else if (modeToApply === 'transliterated') targetSegments = state.transliteratedSegments;
    else if (modeToApply === 'translated') targetSegments = state.translatedSegments;

    const updatedSegments = targetSegments.map((seg) => {
      let segWords = [...seg.words];
      let segText = seg.text;
      let modified = false;

      for (const rule of rules) {
        if (!rule.search) continue;
        if (!applyAll && replacementsCount >= 1) break;

        const cleanSearch = normalizeUnicodeText(rule.search);
        const cleanReplace = normalizeUnicodeText(rule.replaceWith);
        const isAscii = /^[\x00-\x7F]+$/.test(cleanSearch);

        if (segWords.length > 0) {
          segWords = segWords.map((w) => {
            if (!applyAll && replacementsCount >= 1) return w;

            const match = /^([^\p{L}\p{N}\p{M}]*)([\p{L}\p{N}\p{M}]+)([^\p{L}\p{N}\p{M}]*)$/u.exec(w.word.trim());
            if (!match) return w;

            const [, prefix, core, suffix] = match;
            const normalizedCore = normalizeUnicodeText(core);

            const isMatch = isAscii
              ? normalizedCore.toLowerCase() === cleanSearch.toLowerCase()
              : normalizedCore === cleanSearch;

            if (isMatch) {
              replacementsCount++;
              modified = true;
              return {
                ...w,
                word: `${prefix}${cleanReplace}${suffix}`,
              };
            }
            return w;
          });
          segText = segWords.map((w) => w.word.trim()).join(' ');
        } else {
          const match = /^([^\p{L}\p{N}\p{M}]*)([\p{L}\p{N}\p{M}]+)([^\p{L}\p{N}\p{M}]*)$/u.exec(segText.trim());
          if (match) {
            const [, prefix, core, suffix] = match;
            const normalizedCore = normalizeUnicodeText(core);
            const isMatch = isAscii
              ? normalizedCore.toLowerCase() === cleanSearch.toLowerCase()
              : normalizedCore === cleanSearch;

            if (isMatch) {
              replacementsCount++;
              modified = true;
              segText = `${prefix}${cleanReplace}${suffix}`;
            }
          }
        }
      }

      if (modified) {
        return {
          ...seg,
          text: segText,
          words: segWords,
        };
      }
      return seg;
    });

    if (replacementsCount > 0) {
      const snapshot = getGlobalSnapshot(state);
      const updates: Partial<EditorState> = {
        past: [...state.past, snapshot].slice(-50),
        future: [],
        canUndo: true,
        canRedo: false,
      };

      if (modeToApply === 'original') {
        updates.originalSegments = updatedSegments;
        if (state.subtitleMode === 'original') updates.segments = updatedSegments;
      } else if (modeToApply === 'transliterated') {
        updates.transliteratedSegments = updatedSegments;
        if (state.subtitleMode === 'transliterated') updates.segments = updatedSegments;
      } else if (modeToApply === 'translated') {
        updates.translatedSegments = updatedSegments;
        if (state.subtitleMode === 'translated') updates.segments = updatedSegments;
      }

      set(updates);
    }

    return { replacementsCount };
  },

  validateTimingModel: () => {
    const errors: string[] = [];
    const segments = get().segments;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (!Number.isFinite(seg.start) || !Number.isFinite(seg.end)) {
        errors.push(`Segment ${seg.id} has non-finite timestamps (start: ${seg.start}, end: ${seg.end}).`);
      } else if (seg.start >= seg.end) {
        errors.push(`Segment ${seg.id} has invalid boundaries (start >= end).`);
      }

      if (i > 0) {
        const prev = segments[i - 1];
        if (seg.start < prev.end) {
          errors.push(`Segment ${seg.id} overlaps with previous Segment ${prev.id}.`);
        }
      }

      for (const w of seg.words) {
        if (!Number.isFinite(w.start) || !Number.isFinite(w.end)) {
          errors.push(`Word "${w.word}" in Segment ${seg.id} has non-finite timestamps.`);
        } else if (w.start >= w.end) {
          errors.push(`Word "${w.word}" in Segment ${seg.id} has invalid boundaries (start >= end: ${w.start} >= ${w.end}).`);
        }

        if (w.start < seg.start - 0.001 || w.end > seg.end + 0.001) {
          errors.push(`Word "${w.word}" escapes bounds of Segment ${seg.id} (word: ${w.start}-${w.end}, seg: ${seg.start}-${seg.end}).`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  pushHistory: () =>
    set((state) => {
      const snapshot = getGlobalSnapshot(state);
      return { past: [...state.past, snapshot].slice(-50), future: [], canUndo: true, canRedo: false };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const currentSnapshot = getGlobalSnapshot(state);

      return {
        segments: previous.segments,
        originalSegments: previous.originalSegments,
        transliteratedSegments: previous.transliteratedSegments,
        translatedSegments: previous.translatedSegments,
        subtitleStyle: previous.subtitleStyle,
        captionConfig: previous.captionConfig,
        past: newPast,
        future: [currentSnapshot, ...state.future],
        canUndo: newPast.length > 0,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};

      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const currentSnapshot = getGlobalSnapshot(state);

      return {
        segments: next.segments,
        originalSegments: next.originalSegments,
        transliteratedSegments: next.transliteratedSegments,
        translatedSegments: next.translatedSegments,
        subtitleStyle: next.subtitleStyle,
        captionConfig: next.captionConfig,
        past: [...state.past, currentSnapshot].slice(-50),
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    }),
}));

useEditorStore.subscribe((state, prevState) => {
  if (
    state.segments !== prevState.segments ||
    state.subtitleStyle !== prevState.subtitleStyle ||
    state.layoutContext !== prevState.layoutContext ||
    state.activePreset !== prevState.activePreset
  ) {
    state.recomputeBlocks();
  }
});
