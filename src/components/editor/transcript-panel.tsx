'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Search, Clock, Type, SplitSquareHorizontal, Merge, Replace, ChevronDown, ChevronUp } from 'lucide-react';
import { CaptionTools } from '@/components/editor/caption-tools';

export function TranscriptPanel() {
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
    autoLineBreak,
    removeFillers,
    replaceText,
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

          <CaptionTools />
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
  words: { id: string; segId: number; word: string; start: number; end: number }[];
  currentTime: number;
  onWordClick: (start: number) => void;
  updateWordText: (segId: number, wordId: string, text: string) => void;
  selectedWordIds: string[];
  toggleWordSelection: (wordId: string, multiSelect: boolean) => void;
}) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [tempValue, setTempValue] = React.useState('');
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

  const saveEditing = (idx: number) => {
    if (tempValue.trim() !== '') {
      updateWordText(words[idx].segId, words[idx].id, ' ' + tempValue.trim());
    }
    setEditingIndex(null);
  };

  return (
    <div className="p-3">
      <div className="flex flex-wrap gap-1.5">
        {words.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-8 w-full">No words found.</p>
        ) : (
          words.map((word, i) => {
            const isActive = currentTime >= word.start && currentTime <= word.end;
            const isEditing = editingIndex === i;
            const isSelected = selectedWordIds.includes(word.id);

            if (isEditing) {
              return (
                <input
                  key={word.id}
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveEditing(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing(i);
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                  className="px-2 py-1 rounded text-sm bg-zinc-800 border border-violet-500 text-white w-20 focus:outline-none focus:ring-0"
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
                className={`px-2 py-1 rounded text-sm transition-all duration-150 relative ${
                  isSelected 
                    ? 'bg-violet-600 border border-violet-400 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)] z-10'
                    : isActive
                      ? 'bg-violet-500/20 text-violet-300 font-medium'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
                }`}
                title={`Double click to edit | Shift+Click to multi-select | ${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`}
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
