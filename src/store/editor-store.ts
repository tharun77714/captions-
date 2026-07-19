import { create } from 'zustand';
import type {
  SubtitleStyleV2,
  CaptionConfig,
  HighlightMode,
  TransitionConfig,
} from '@/lib/subtitle-schema-v2';
import {
  DEFAULT_STYLE,
  DEFAULT_CAPTION_CONFIG,
  ensureV2,
} from '@/lib/subtitle-schema-v2';
import type {
  SubtitleStyleV3,
  WordStyleOverride,
  SegmentStyleOverride,
} from '@/lib/subtitle-schema-v3';
import { EMPTY_OVERRIDES, ensureV3 } from '@/lib/subtitle-schema-v3';
import { getTemplateById } from '@/lib/templates-data';
import { enrichTranscript, SemanticTag } from '@/lib/semantic-engine';

// ─── Types ────────────────────────────────────────────────────────────

// Raw types from API/Database
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

// Editor Internal Types (Hierarchical)
export interface Word {
  id: string; // Stable UUID/generated ID for React keys
  word: string;
  start: number;
  end: number;
  probability?: number;
  style?: WordStyleOverride;
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: Word[]; // Hierarchical ownership!
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

// ─── State Interface ──────────────────────────────────────────────────
interface EditorState {
  // Project data
  projectId: string | null;
  projectTitle: string;
  videoUrl: string | null;
  language: string;

  // Transcript data (Strict Hierarchical Model)
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

  // Actions
  setProjectData: (data: {
    projectId: string;
    projectTitle: string;
    language: string;
  }) => void;
  setVideoUrl: (url: string) => void;
  
  // Converts flat DB arrays to internal hierarchical segments
  setTranscriptData: (
    rawSegments: RawSegment[],
    rawWords: RawWord[],
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
  
  // Selection & Overrides
  selectedWordIds: string[];
  toggleWordSelection: (wordId: string, multiSelect: boolean) => void;
  clearWordSelection: () => void;
  updateSelectedWordsStyle: (style: Partial<WordStyleOverride>) => void;
  updateSegmentStyle: (segmentId: number, style: Partial<SegmentStyleOverride>) => void;
  // Edit Actions
  updateSegmentText: (id: number, text: string) => void;
  updateSegmentTiming: (id: number, start: number, end: number) => void;
  updateWordText: (segId: number, wordId: string, newWord: string) => void;
  splitSegment: (id: number, splitTime: number) => void;
  mergeSegments: (id: number) => void;
  deleteSegment: (id: number) => void;
  autoLineBreak: (maxChars?: number) => void;
  removeFillers: () => void;
  removePunctuation: () => void;
  removeEmojis: () => void;
  restoreEmphasis: () => void;
  removeGaps: () => void;
  replaceText: (search: string, replaceWith: string, replaceAll: boolean, segId?: number) => void;
  
  // Validation
  validateTimingModel: () => ValidationReport;

  // History Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

// ─── Default Subtitle Style ──────────────────────────────────────────
/** @deprecated Use DEFAULT_STYLE from subtitle-schema-v2.ts */
const defaultSubtitleStyle: SubtitleStyleV3 = { ...DEFAULT_STYLE, _version: 3, overrides: EMPTY_OVERRIDES };

// ─── Helpers ──────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).substr(2, 9);

const getBackingUpdates = (state: EditorState, newSegments: Segment[]) => {
  const updates: Partial<EditorState> = {};
  if (state.subtitleMode === 'original') {
    updates.originalSegments = newSegments;
  } else if (state.subtitleMode === 'transliterated') {
    updates.transliteratedSegments = newSegments;
  } else if (state.subtitleMode === 'translated') {
    updates.translatedSegments = newSegments;
  }
  return updates;
};

const getSnapshot = (state: EditorState, newSegments: Segment[]): HistorySnapshot => {
  const backing = getBackingUpdates(state, newSegments);
  return {
    segments: newSegments,
    originalSegments: backing.originalSegments || state.originalSegments,
    transliteratedSegments: backing.transliteratedSegments || state.transliteratedSegments,
    translatedSegments: backing.translatedSegments || state.translatedSegments,
    subtitleStyle: state.subtitleStyle,
    captionConfig: state.captionConfig
  };
};

const getGlobalSnapshot = (
  state: EditorState,
  newSegments: Segment[],
  newOriginal: Segment[],
  newTranslit: Segment[],
  newTranslated: Segment[]
): HistorySnapshot => ({
  segments: newSegments,
  originalSegments: newOriginal,
  transliteratedSegments: newTranslit,
  translatedSegments: newTranslated,
  subtitleStyle: state.subtitleStyle,
  captionConfig: state.captionConfig
});


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

  // Distribute remaining words
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

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  projectTitle: '',
  videoUrl: null,
  language: '',

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

  setProjectData: ({ projectId, projectTitle, language }) =>
    set({ projectId, projectTitle, language }),

  setVideoUrl: (videoUrl) => set({ videoUrl }),

  setTranscriptData: (
    rawSegments,
    rawWords,
    rawTranslitSegments,
    rawTranslitWords,
    rawTransSegments,
    rawTransWords,
    waveform
  ) => {
    const mapHierarchical = (segs: RawSegment[] = [], wrds: RawWord[] = []) => {
      const sortedWrds = [...wrds].sort((a, b) => a.start - b.start);
      return segs.map(seg => {
        const s = seg.start;
        const e = Math.max(s + 0.1, seg.end);
        let ownedWords = sortedWrds
          .filter(w => w.start >= s && w.end <= e)
          .map(w => ({ ...w, id: `w-${generateId()}` }));
        
        // Generate synthetic words if missing (e.g., for translated/transliterated segments)
        if (ownedWords.length === 0 && seg.text.trim().length > 0) {
          const tokens = seg.text.trim().split(/\s+/).filter(Boolean);
          const duration = e - s;
          const wordDuration = duration / Math.max(1, tokens.length);
          
          ownedWords = tokens.map((token, i) => ({
            id: `w-${generateId()}`,
            word: token,
            start: s + (i * wordDuration),
            end: s + ((i + 1) * wordDuration),
            probability: 0.9
          }));
        }
        
        return {
          ...seg,
          start: s,
          end: e,
          words: ownedWords
        };
      });
    };

    const originalSegments = mapHierarchical(rawSegments, rawWords);
    const transliteratedSegments = mapHierarchical(rawTranslitSegments || [], rawTranslitWords || []);
    const translatedSegments = mapHierarchical(rawTransSegments || [], rawTransWords || []);

    set({
      originalSegments,
      transliteratedSegments,
      translatedSegments,
      segments: originalSegments,
      waveform: waveform || undefined,
      subtitleMode: 'original',
      semanticTags: enrichTranscript(originalSegments.flatMap(s => s.words)),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false
    });

    // Auto-split massive caption blocks on import if detected (e.g. segments > 15s or > 20 words)
    const hasMassiveBlocks = originalSegments.some(seg => seg.end - seg.start > 15 || seg.words.length > 20);
    if (hasMassiveBlocks) {
      get().autoLineBreak();
      // Clear history so the auto-split is the initial state
      set({ past: [], future: [], canUndo: false, canRedo: false });
    }
  },

  setWaveform: (waveform) => set({ waveform }),

  setSubtitleMode: (subtitleMode) =>
    set((state) => {
      const backingUpdates: Partial<EditorState> = {};
      if (state.subtitleMode === 'original') {
        backingUpdates.originalSegments = state.segments;
      } else if (state.subtitleMode === 'transliterated') {
        backingUpdates.transliteratedSegments = state.segments;
      } else if (state.subtitleMode === 'translated') {
        backingUpdates.translatedSegments = state.segments;
      }

      let targetSegments = state.originalSegments;
      if (subtitleMode === 'transliterated') {
        targetSegments = state.transliteratedSegments;
      } else if (subtitleMode === 'translated') {
        targetSegments = state.translatedSegments;
      }

      return {
        ...backingUpdates,
        subtitleMode,
        segments: targetSegments,
      };
    }),

  setCurrentTime: (currentTime) => set({ currentTime }),

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
      const snapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        subtitleStyle: updater(state.subtitleStyle),
        past: newPast,
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
      const snapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        subtitleStyle: { 
          ...ensureV3(template.style),
          positionX: state.subtitleStyle.positionX,
          positionY: state.subtitleStyle.positionY,
        },
        activeTemplateId: templateId,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  applyCreatorPreset: (presetId, version) =>
    set((state) => {
      const snapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        subtitleStyle: { 
          ...state.subtitleStyle,
          activePreset: { id: presetId, version }
        },
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  applyAiHighlighting: () => set((state) => {
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

    const snapshot: HistorySnapshot = { ...state, subtitleStyle: state.subtitleStyle } as any; // simplified snapshot
    return {
      subtitleStyle: { ...state.subtitleStyle, overrides: newOverrides },
      past: [...state.past, snapshot].slice(-50),
      future: [],
      canUndo: true,
      canRedo: false,
    };
  }),

  applyAiEmojis: () => set((state) => {
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

    const snapshot: HistorySnapshot = { ...state, subtitleStyle: state.subtitleStyle } as any; // simplified snapshot
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

  toggleWordSelection: (wordId, multiSelect) => set((state) => {
    let next: string[];
    if (multiSelect) {
      if (state.selectedWordIds.includes(wordId)) {
        next = state.selectedWordIds.filter(id => id !== wordId);
      } else {
        next = [...state.selectedWordIds, wordId];
      }
    } else {
      next = state.selectedWordIds.includes(wordId) && state.selectedWordIds.length === 1 
        ? [] 
        : [wordId];
    }
    return { selectedWordIds: next };
  }),

  clearWordSelection: () => set({ selectedWordIds: [] }),

  updateSelectedWordsStyle: (style) => set((state) => {
    if (state.selectedWordIds.length === 0) return {};
    const newOverrides = { ...state.subtitleStyle.overrides };
    newOverrides.wordStyles = { ...newOverrides.wordStyles };
    
    for (const wordId of state.selectedWordIds) {
      newOverrides.wordStyles[wordId] = {
        ...(newOverrides.wordStyles[wordId] || {}),
        ...style
      };
    }
    
    return { 
      subtitleStyle: { 
        ...state.subtitleStyle, 
        overrides: newOverrides 
      } 
    };
  }),

  updateSegmentStyle: (segmentId, style) => set((state) => {
    const newOverrides = { ...state.subtitleStyle.overrides };
    newOverrides.segmentStyles = { ...newOverrides.segmentStyles };
    
    newOverrides.segmentStyles[segmentId] = {
      ...(newOverrides.segmentStyles[segmentId] || {}),
      ...style
    };
    
    return { 
      subtitleStyle: { 
        ...state.subtitleStyle, 
        overrides: newOverrides 
      } 
    };
  }),

  updateSegmentText: (id, text) =>
    set((state) => {
      const newSegments = state.segments.map((seg) => {
        if (seg.id !== id) return seg;

        const newWordTokens = text.trim().split(/\s+/).filter(Boolean);
        let newWords: Word[] = [];

        if (newWordTokens.length === seg.words.length) {
          // Fallback Strategy 1: Exact length match.
          // Safely map new text directly to existing words, preserving perfect timing.
          newWords = newWordTokens.map((token, i) => ({
            ...seg.words[i],
            word: token
          }));
        } else {
          // Fallback Strategy 2: Length mismatch (words added/deleted).
          // Why: Mapping arbitrary insertions/deletions to old timestamps without a proper Myers diff is highly error-prone.
          // Action: Distribute words uniformly across the segment duration.
          // Future Scalability: We can add an AI timing correction API call here to re-align timings asynchronously.
          const duration = seg.end - seg.start;
          const wordDuration = duration / Math.max(1, newWordTokens.length);
          
          newWords = newWordTokens.map((token, i) => ({
            id: `w-${generateId()}`,
            word: token,
            start: seg.start + (i * wordDuration),
            end: seg.start + ((i + 1) * wordDuration),
            probability: 0.9 // Synthetic
          }));
        }

        return { ...seg, text, words: newWords };
      });

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  updateSegmentTiming: (id: number, start: number, end: number) =>
    set((state) => {
      const updateTimingForSegments = (segs: Segment[]) => {
        return segs.map((seg) => {
          if (seg.id === id) {
            // Snap segment bounds to 0.1s
            const snappedStart = Math.max(0, Math.round(start * 10) / 10);
            const snappedEnd = Math.max(snappedStart + 0.1, Math.round(end * 10) / 10);
            
            const delta = snappedStart - seg.start;
            
            // Phase 2.5: Shift EVERY owned word by the exact delta.
            // Preserves absolute internal timing durations and karaoke synchronization!
            const newWords = seg.words.map(w => ({
              ...w,
              start: Math.max(0, w.start + delta),
              end: Math.max(0.1, w.end + delta)
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

      const snapshot = getGlobalSnapshot(state, newSegments, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  updateWordText: (segId, wordId, newWordText) =>
    set((state) => {
      const newSegments = state.segments.map(seg => {
        if (seg.id !== segId) return seg;
        
        // Update the owned word, potentially splitting it if spaces were inserted
        const newWords = seg.words.flatMap(w => {
          if (w.id !== wordId) return [w];
          
          const trimmed = newWordText.trim();
          if (!trimmed) return []; // Allow deletion
          
          const tokens = trimmed.split(/\s+/);
          if (tokens.length === 1) {
            return [{ ...w, word: newWordText }];
          }

          // Distribute time evenly across new word tokens
          const duration = w.end - w.start;
          const step = duration / tokens.length;
          
          return tokens.map((token, idx) => {
            const isFirst = idx === 0;
            // Preserve leading space only on the first token (since transcript panel might pass ' ' + word)
            const leadingSpace = isFirst ? (newWordText.match(/^\s*/) || [''])[0] : '';
            return {
              ...w,
              id: isFirst ? w.id : `w-${generateId()}`,
              word: leadingSpace + token,
              start: w.start + (idx * step),
              end: w.start + ((idx + 1) * step)
            };
          });
        });
        
        // Rebuild parent segment text strictly from owned words
        const newText = newWords.map(w => w.word.trim()).join(' ');
        
        return { ...seg, text: newText, words: newWords };
      });

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  splitSegment: (id, splitTime) =>
    set((state) => {
      const idx = state.segments.findIndex((s) => s.id === id);
      if (idx === -1) return {};
      const seg = state.segments[idx];
      if (splitTime <= seg.start || splitTime >= seg.end) return {};

      const newSegBId = Math.max(0, ...state.segments.map(s => s.id), ...state.originalSegments.map(s => s.id), ...state.transliteratedSegments.map(s => s.id), ...state.translatedSegments.map(s => s.id)) + 1;

      const splitHelper = (segs: Segment[]) => {
        const targetIdx = segs.findIndex(s => s.id === id);
        if (targetIdx === -1) return segs;
        const targetSeg = segs[targetIdx];
        
        const splitIdx = targetSeg.words.findIndex(w => w.start >= splitTime);
        
        const wordsA = splitIdx === -1 ? [...targetSeg.words] : targetSeg.words.slice(0, splitIdx);
        const wordsB = splitIdx === -1 ? [] : targetSeg.words.slice(splitIdx);
        
        const textA = wordsA.map(w => w.word.trim()).join(' ');
        const textB = wordsB.map(w => w.word.trim()).join(' ');
        
        const endA = wordsA.length > 0 ? wordsA[wordsA.length - 1].end : splitTime;
        const startB = wordsB.length > 0 ? wordsB[0].start : splitTime;

        const newSegA: Segment = {
          id: targetSeg.id,
          start: targetSeg.start,
          end: endA,
          text: textA || '...',
          words: wordsA
        };
        const newSegB: Segment = {
          id: newSegBId,
          start: startB,
          end: targetSeg.end,
          text: textB || '...',
          words: wordsB
        };
        
        const res = [...segs];
        res.splice(targetIdx, 1, newSegA, newSegB);
        return res;
      };

      const newSegments = splitHelper(state.segments);
      const newOriginal = splitHelper(state.originalSegments);
      const newTranslit = splitHelper(state.transliteratedSegments);
      const newTranslated = splitHelper(state.translatedSegments);
      
      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state, activeTarget, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  replaceText: (search, replaceWith, replaceAll, segId) =>
    set((state) => {
      if (!search) return {};

      let replacedCount = 0;
      // We escape the search string to avoid regex injection unless we want regex. The user usually wants literal replace.
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegExp(search), replaceAll ? 'gi' : 'i');

      const newSegments = state.segments.map((seg) => {
        if (segId !== undefined && seg.id !== segId) return seg;
        if (!replaceAll && replacedCount > 0) return seg;

        let segTextReplaced = false;
        const origSegStart = seg.start;
        const origSegEnd = seg.end;
        
        let newWords = seg.words;
        let newText = seg.text;

        if (seg.words.length > 0) {
          // Replace in words
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
          newText = newWords.map(w => w.word.trim()).join(' ');
        } else {
          // Segment has no words (e.g. translation)
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
          // 2. SEGMENT TIMING PROTECTION ASSERTIONS
          if (origSegStart !== seg.start || origSegEnd !== seg.end) {
             console.error("CRITICAL ERROR: Segment timing modified during replace!");
          }
          
          return {
            ...seg,
            text: newText,
            words: newWords
          };
        }
        return seg;
      });

      if (replacedCount === 0) return {};

      // 1. FIND & REPLACE HISTORY AUDIT
      // All replacements occur above. This pushes EXACTLY one snapshot.
      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
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
          words: [...segA.words, ...segB.words]
        };
        
        const res = [...segs];
        res.splice(targetIdx, 2, mergedSeg);
        return res;
      };

      const newSegments = mergeHelper(state.segments);
      const newOriginal = mergeHelper(state.originalSegments);
      const newTranslit = mergeHelper(state.transliteratedSegments);
      const newTranslated = mergeHelper(state.translatedSegments);
      
      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state, activeTarget, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  deleteSegment: (id) =>
    set((state) => {
      const deleteHelper = (segs: Segment[]) => {
        return segs.filter(s => s.id !== id);
      };

      const newSegments = deleteHelper(state.segments);
      const newOriginal = deleteHelper(state.originalSegments);
      const newTranslit = deleteHelper(state.transliteratedSegments);
      const newTranslated = deleteHelper(state.translatedSegments);

      const snapshot = getGlobalSnapshot(state, newSegments, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  autoLineBreak: (maxChars?: number) => 
    set((state) => {
      const limit = maxChars ?? state.captionConfig.maxCharsPerLine ?? 24;
      const maxWords = state.captionConfig.maxWordsPerLine ?? 0;

      // Sort flat word lists chronologically to prevent out-of-order words from corrupting segment bounds
      const activeWords = [...state.segments.flatMap(s => s.words)].sort((a, b) => a.start - b.start);
      const originalWords = [...state.originalSegments.flatMap(s => s.words)].sort((a, b) => a.start - b.start);

      const groups: number[][] = [];
      let currentGroup: number[] = [];
      let currentText = '';

      for (let i = 0; i < activeWords.length; i++) {
        const w = activeWords[i];
        const wordText = w.word.trim();
        if (!wordText) continue;

        const space = currentText.length > 0 ? ' ' : '';
        const potentialText = currentText + space + wordText;

        const gap = currentGroup.length > 0 ? w.start - activeWords[currentGroup[currentGroup.length - 1]].end : 0;
        
        const isLengthExceeded = potentialText.length > limit;
        const isWordLimitExceeded = maxWords > 0 && currentGroup.length >= maxWords;
        const isLargeGap = gap > 0.5; // snappier pauses for Reels/Shorts

        if (isLengthExceeded || isWordLimitExceeded || isLargeGap) {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [i];
          currentText = wordText;
        } else {
          currentGroup.push(i);
          currentText = potentialText;
        }

        // If this word ends with sentence-ending punctuation, trigger split for the NEXT word
        const endsWithSentencePunctuation = /[.!?]$/.test(wordText);
        if (endsWithSentencePunctuation) {
          groups.push(currentGroup);
          currentGroup = [];
          currentText = '';
        }
      }

      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      const buildSegmentsFromGroups = (wordsList: Word[]) => {
        let segId = 1;
        return groups.map(group => {
          const groupWords = group.map(idx => wordsList[idx]).filter(Boolean);
          const text = groupWords.map(w => w.word.trim()).join(' ');
          const s = groupWords[0]?.start || 0;
          const e = Math.max(s + 0.1, groupWords[groupWords.length - 1]?.end || 0.1);
          return {
            id: segId++,
            start: s,
            end: e,
            text,
            words: groupWords
          };
        });
      };

      const newSegments = buildSegmentsFromGroups(activeWords);
      const newOriginal = buildSegmentsFromGroups(originalWords);
      const newTranslit = resegmentWithoutWords(state.transliteratedSegments, newOriginal);
      const newTranslated = resegmentWithoutWords(state.translatedSegments, newOriginal);

      const snapshot = getGlobalSnapshot(state, newSegments, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  removeFillers: () =>
    set((state) => {
      const fillers = new Set(['um', 'uh', 'like', 'you know', 'so', 'hmm', 'ah']);
      const isFiller = (text: string) => {
        const clean = text.toLowerCase().replace(/[^a-z ]/g, '').trim();
        return fillers.has(clean);
      };

      const newSegments = state.segments.map(seg => {
        if (seg.words.length === 0) return seg; // Skip translated segments
        
        // Strict ownership filtering
        const newWords = seg.words.filter(w => !isFiller(w.word));
        return {
          ...seg,
          text: newWords.map(w => w.word.trim()).join(' '),
          words: newWords
        };
      }).filter(seg => seg.words.length > 0 || seg.text.length > 0);

      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  removePunctuation: () =>
    set((state) => {
      const newSegments = state.segments.map(seg => {
        if (seg.words.length === 0) {
          return { ...seg, text: seg.text.replace(/[.,!?;:'"()[\]{}]/g, '') };
        }
        
        const newWords = seg.words.map(w => ({
          ...w,
          word: w.word.replace(/[.,!?;:'"()[\]{}]/g, ''),
        }));
        return {
          ...seg,
          text: newWords.map(w => w.word.trim()).join(' '),
          words: newWords
        };
      });
      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  removeEmojis: () =>
    set((state) => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
      const newSegments = state.segments.map(seg => {
        if (seg.words.length === 0) {
          return { ...seg, text: seg.text.replace(emojiRegex, '').trim() };
        }
        const newWords = seg.words.map(w => ({
          ...w,
          word: w.word.replace(emojiRegex, '').trim(),
        })).filter(w => w.word.length > 0);
        return {
          ...seg,
          text: newWords.map(w => w.word.trim()).join(' '),
          words: newWords,
        };
      }).filter(seg => seg.words.length > 0 || seg.text.length > 0);
      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  restoreEmphasis: () =>
    set((state) => {
      const newSegments = state.segments.map(seg => {
        if (seg.words.length === 0) return seg;
        const newWords = seg.words.map((w, i) => {
          if (i === 0) {
            return { ...w, word: w.word.charAt(0).toUpperCase() + w.word.slice(1) };
          }
          return w;
        });
        return {
          ...seg,
          text: newWords.map(w => w.word.trim()).join(' '),
          words: newWords,
        };
      });
      const backingUpdates = getBackingUpdates(state, newSegments);
      const snapshot = getSnapshot(state, newSegments);
      const newPast = [...state.past, snapshot].slice(-50);
      return {
        segments: newSegments,
        ...backingUpdates,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  removeGaps: () =>
    set((state) => {
      const removeGapsHelper = (segs: Segment[]) => {
        if (segs.length <= 1) return segs;
        const result: Segment[] = [];
        result.push(segs[0]);
        
        for (let i = 1; i < segs.length; i++) {
          const seg = segs[i];
          const prev = result[i - 1];
          if (seg.start > prev.end) {
            const delta = seg.start - prev.end;
            const newWords = seg.words.map(w => ({
              ...w,
              start: Math.max(prev.end, w.start - delta),
              end: Math.max(prev.end + 0.05, w.end - delta),
            }));
            result.push({
              ...seg,
              start: prev.end,
              end: Math.max(prev.end + 0.1, seg.end - delta),
              words: newWords
            });
          } else {
            result.push(seg);
          }
        }
        return result;
      };

      const newSegments = removeGapsHelper(state.segments);
      const newOriginal = removeGapsHelper(state.originalSegments);
      const newTranslit = removeGapsHelper(state.transliteratedSegments);
      const newTranslated = removeGapsHelper(state.translatedSegments);
      
      let activeTarget = newOriginal;
      if (state.subtitleMode === 'transliterated') activeTarget = newTranslit;
      else if (state.subtitleMode === 'translated') activeTarget = newTranslated;

      const snapshot = getGlobalSnapshot(state, activeTarget, newOriginal, newTranslit, newTranslated);
      const newPast = [...state.past, snapshot].slice(-50);

      return {
        segments: activeTarget,
        originalSegments: newOriginal,
        transliteratedSegments: newTranslit,
        translatedSegments: newTranslated,
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false
      };
    }),

  validateTimingModel: () => {
    const errors: string[] = [];
    const segments = get().segments;
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      
      if (seg.start >= seg.end) {
        errors.push(`Segment ${seg.id} has invalid boundaries (start >= end).`);
      }

      for (const w of seg.words) {
        if (w.start < seg.start - 0.5 || w.end > seg.end + 0.5) { 
          // Relaxed tolerance for float math and whisper inaccuracies
          errors.push(`Word "${w.word}" escapes bounds of Segment ${seg.id}.`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  pushHistory: () =>
    set((state) => {
      const snapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newPast = [...state.past, snapshot].slice(-50);
      return { past: newPast, future: [], canUndo: true, canRedo: false };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      const currentSnapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newFuture = [currentSnapshot, ...state.future];

      return {
        segments: previous.segments,
        originalSegments: previous.originalSegments,
        transliteratedSegments: previous.transliteratedSegments,
        translatedSegments: previous.translatedSegments,
        subtitleStyle: previous.subtitleStyle,
        captionConfig: previous.captionConfig,
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      const currentSnapshot: HistorySnapshot = {
        segments: state.segments,
        originalSegments: state.originalSegments,
        transliteratedSegments: state.transliteratedSegments,
        translatedSegments: state.translatedSegments,
        subtitleStyle: state.subtitleStyle,
        captionConfig: state.captionConfig
      };
      const newPast = [...state.past, currentSnapshot].slice(-50);

      return {
        segments: next.segments,
        originalSegments: next.originalSegments,
        transliteratedSegments: next.transliteratedSegments,
        translatedSegments: next.translatedSegments,
        subtitleStyle: next.subtitleStyle,
        captionConfig: next.captionConfig,
        past: newPast,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    }),
}));
