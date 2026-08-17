'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Search, Clock, Type, SplitSquareHorizontal, Merge, Replace, ChevronDown, ChevronUp, Scissors } from 'lucide-react';
import { CaptionTools } from '@/components/editor/caption-tools';

function SplitByWords() {
  const [selectedN, setSelectedN] = React.useState(3);
  const [showToast, setShowToast] = React.useState(false);
  const { autoSplitByWords } = useEditorStore();

  const handleApply = () => {
    autoSplitByWords(selectedN);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-full px-2 py-1 relative">
      <span className="text-xs text-zinc-400 font-medium pl-1">Auto-split</span>
      <select 
        value={selectedN} 
        onChange={(e) => setSelectedN(Number(e.target.value))}
        className="bg-zinc-800 text-xs text-zinc-200 border-none rounded px-1 py-0.5 focus:outline-none"
      >
        {[1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>{n} words</option>
        ))}
      </select>
      <button 
        onClick={handleApply}
        className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full transition-colors"
      >
        <Scissors className="w-3 h-3" />
        Apply
      </button>
      {showToast && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
          Done
        </div>
      )}
    </div>
  );
}

interface TranscriptPanelProps {
  userId?: string;
}

export function TranscriptPanel({ userId }: TranscriptPanelProps) {
  const {
    segments,
    currentTime,
    searchQuery,
    editMode,
    setSearchQuery,
    setCurrentTime,
    setEditMode,
    updateSegmentText,
    updateWordText,
    splitSegment,
    mergeSegments,
    replaceText,
    applyTemplate,
    selectedWordIds,
    toggleWordSelection,
  } = useEditorStore();

  const [replaceQuery, setReplaceQuery] = React.useState('');
  const [showReplace, setShowReplace] = React.useState(false);

  const handleReplace = () => {
    replaceText(searchQuery, replaceQuery, false);
  };

  const handleReplaceAll = () => {
    replaceText(searchQuery, replaceQuery, true);
  };

  // Filter segments/words by search
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  const filteredWords = useMemo(() => {
    const allWords = segments.flatMap((seg) =>
      seg.words.map((w) => ({ ...w, segId: seg.id }))
    );
    if (!searchQuery.trim()) return allWords;
    const q = searchQuery.toLowerCase();
    return allWords.filter((w) => w.word.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  const handleSegmentClick = (start: number) => {
    setCurrentTime(start);
  };

  const handleWordClick = (start: number) => {
    setCurrentTime(start);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Transcript</h2>

        {/* Search & Replace */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button 
              onClick={() => setShowReplace(!showReplace)}
              className="absolute right-2 p-1 text-zinc-500 hover:text-white transition-colors"
              title="Toggle Find and Replace"
            >
              {showReplace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          {showReplace && (
            <div className="relative flex items-center gap-2 animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="relative flex-1">
                <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleReplace}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-xs text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Replace
              </button>
              <button 
                onClick={handleReplaceAll}
                disabled={!searchQuery}
                className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-xs text-white rounded-lg transition-colors whitespace-nowrap"
              >
                All
              </button>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex flex-1 p-0.5 bg-zinc-900 rounded-lg">
            <button
              onClick={() => setEditMode('line')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                editMode === 'line'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Type className="w-3 h-3" />
              Segments
            </button>
            <button
              onClick={() => setEditMode('word')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                editMode === 'word'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Clock className="w-3 h-3" />
              Words
            </button>
          </div>

          <CaptionTools userId={userId} />
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <SplitByWords />
        </div>

        {/* Quick Viral Presets Bar */}
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Quick Styles:</span>
            <span className="text-[9px] text-zinc-600 font-mono">1-Click Apply</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
            {[
              { id: 'kalakar-glow', label: 'Glow', color: 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10' },
              { id: 'hormozi-style', label: 'Hormozi', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
              { id: 'tiktok-viral-yellow', label: 'Viral Yellow', color: 'border-yellow-400/40 text-yellow-200 bg-yellow-400/10' },
              { id: 'neon-cyberpunk', label: 'Cyberpunk', color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' },
              { id: 'cinema-gold', label: 'Gold', color: 'border-orange-500/40 text-orange-300 bg-orange-500/10' },
              { id: 'sam-sulek-raw', label: 'Red Impact', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
              { id: 'podcast-clean', label: 'Podcast', color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
              { id: 'ali-abdaal', label: 'Minimal', color: 'border-zinc-700 text-zinc-300 bg-zinc-800/50' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyTemplate(preset.id)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all hover:scale-105 ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {editMode === 'line' ? (
          <SegmentList
            segments={filteredSegments}
            currentTime={currentTime}
            onSegmentClick={handleSegmentClick}
            updateSegmentText={updateSegmentText}
            splitSegment={splitSegment}
            mergeSegments={mergeSegments}
            isLastSegment={(id) => segments[segments.length - 1]?.id === id}
          />
        ) : (
          <WordList
            words={filteredWords}
            currentTime={currentTime}
            onWordClick={handleWordClick}
            updateWordText={updateWordText}
            selectedWordIds={selectedWordIds}
            toggleWordSelection={toggleWordSelection}
          />
        )}
      </div>
    </div>
  );
}

// ─── Segment List ─────────────────────────────────────────────────────
function SegmentList({
  segments,
  currentTime,
  onSegmentClick,
  updateSegmentText,
  splitSegment,
  mergeSegments,
  isLastSegment,
}: {
  segments: { id: number; start: number; end: number; text: string; words: { word: string; start: number; end: number }[] }[];
  currentTime: number;
  onSegmentClick: (start: number) => void;
  updateSegmentText: (id: number, text: string) => void;
  splitSegment: (id: number, time: number) => void;
  mergeSegments: (id: number) => void;
  isLastSegment: (id: number) => boolean;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime]);

  return (
    <div className="p-2 space-y-1">
      {segments.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-8">No segments found.</p>
      ) : (
        segments.map((segment, sIdx) => {
          const isActive = currentTime >= segment.start && currentTime <= segment.end;
          return (
            <div
              key={segment.id}
              ref={isActive ? activeRef : null}
              className={`w-full p-3 rounded-lg transition-all duration-200 border flex flex-col gap-2 ${
                isActive
                  ? 'bg-violet-500/15 border-violet-500/30'
                  : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 w-4 select-none">#{sIdx + 1}</span>
                <button
                  onClick={() => onSegmentClick(segment.start)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-400'
                  }`}
                  title="Click to seek playhead"
                >
                  {formatTime(segment.start)}
                </button>
                <span className="text-[10px] text-zinc-600">→</span>
                <button
                  onClick={() => onSegmentClick(segment.end)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-400'
                  }`}
                  title="Click to seek playhead"
                >
                  {formatTime(segment.end)}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => splitSegment(segment.id, currentTime)}
                  disabled={!isActive || currentTime <= segment.start + 0.1 || currentTime >= segment.end - 0.1}
                  className="p-1 text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Split at playhead"
                >
                  <SplitSquareHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => mergeSegments(segment.id)}
                  disabled={isLastSegment(segment.id)}
                  className="p-1 text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Merge with next segment"
                >
                  <Merge className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={segment.text}
                onChange={(e) => updateSegmentText(segment.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const cursorPosition = target.selectionStart;
                    
                    let charCount = 0;
                    let splitTime = -1;
                    
                    if (segment.words && segment.words.length > 0) {
                      for (let i = 0; i < segment.words.length; i++) {
                        const w = segment.words[i].word.trim();
                        if (cursorPosition <= charCount) {
                          splitTime = segment.words[i].start;
                          break;
                        }
                        if (cursorPosition < charCount + w.length) {
                          if (cursorPosition - charCount < w.length / 2) {
                            splitTime = segment.words[i].start;
                          } else {
                            splitTime = i + 1 < segment.words.length ? segment.words[i+1].start : -1;
                          }
                          break;
                        }
                        charCount += w.length + 1; // +1 for space
                      }
                      
                      if (splitTime !== -1 && splitTime > segment.start && splitTime < segment.end) {
                        splitSegment(segment.id, splitTime);
                      }
                    }
                  }
                }}
                className="w-full bg-transparent border-0 outline-none resize-none text-sm leading-relaxed text-zinc-300 focus:text-white focus:ring-0 p-0 focus:outline-none scrollbar-none"
                rows={Math.max(1, Math.ceil(segment.text.length / 32))}
                style={{ overflow: 'hidden' }}
                placeholder="Empty caption text..."
              />
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Word List ────────────────────────────────────────────────────────
function WordList({
  words,
  currentTime,
  onWordClick,
  updateWordText,
  selectedWordIds,
  toggleWordSelection,
}: {
  words: { id: string; segId: number; word: string; start: number; end: number; probability?: number }[];
  currentTime: number;
  onWordClick: (start: number) => void;
  updateWordText: (segId: number, wordId: string, text: string) => void;
  selectedWordIds: string[];
  toggleWordSelection: (wordId: string, multiSelect: boolean) => void;
}) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [tempValue, setTempValue] = React.useState('');
  const lastCommittedWordId = React.useRef<string | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime]);

  const startEditing = (idx: number, currentWord: string) => {
    setEditingIndex(idx);
    setTempValue(currentWord.trim());
  };

  const saveEditing = (idx: number, moveBy = 0) => {
    const word = words[idx];
    if (!word || lastCommittedWordId.current === word.id) return;

    lastCommittedWordId.current = word.id;
    // An empty value is a deliberate deletion; the store preserves all other
    // word timings and only removes this word.
    updateWordText(word.segId, word.id, tempValue.trim() ? ' ' + tempValue.trim() : '');
    setEditingIndex(null);

    if (moveBy !== 0) {
      const nextIndex = Math.max(0, Math.min(words.length - 1, idx + moveBy));
      const nextWord = words[nextIndex];
      if (nextWord && nextWord.id !== word.id) {
        window.setTimeout(() => startEditing(nextIndex, nextWord.word), 0);
      }
    }
    window.setTimeout(() => {
      if (lastCommittedWordId.current === word.id) lastCommittedWordId.current = null;
    }, 0);
  };

  return (
    <div className="p-3">
      <div className="px-3 pt-2 pb-1 flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500/60 inline-block"/>Low conf</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/60 inline-block"/>Mid conf</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-8 w-full">No words found.</p>
        ) : (
          words.map((word, i) => {
            const isActive = currentTime >= word.start && currentTime <= word.end;
            const isEditing = editingIndex === i;
            const isSelected = selectedWordIds.includes(word.id);

            const confidenceClass = 
              word.probability === undefined ? '' :
              word.probability < 0.6 ? 'ring-1 ring-rose-500/40' :
              word.probability < 0.8 ? 'ring-1 ring-amber-500/30' : '';

            if (isEditing) {
              return (
                <input
                  key={word.id}
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveEditing(i)}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      saveEditing(i, e.shiftKey ? -1 : 1);
                    }
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                  className={`px-2 py-1 rounded text-sm bg-zinc-800 border border-violet-500 text-white w-20 focus:outline-none focus:ring-0 ${confidenceClass}`}
                  autoFocus
                />
              );
            }

            return (
              <button
                key={word.id}
                ref={isActive ? activeRef : null}
                onClick={(e) => {
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    toggleWordSelection(word.id, true);
                  } else {
                    onWordClick(word.start);
                    toggleWordSelection(word.id, false);
                  }
                }}
                onDoubleClick={() => startEditing(i, word.word)}
                className={`px-2 py-1 rounded text-sm transition-all duration-150 relative ${confidenceClass} ${
                  isSelected 
                    ? 'bg-violet-600 border border-violet-400 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)] z-10'
                    : isActive
                      ? 'bg-violet-500/20 text-violet-300 font-medium'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
                }`}
                title={`Double click to edit | Shift+Click to multi-select | ${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s | Confidence: ${word.probability !== undefined ? Math.round(word.probability * 100) + '%' : 'N/A'}`}
              >
                {word.word}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
