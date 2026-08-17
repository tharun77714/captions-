'use client';

import React, { useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Search, SplitSquareHorizontal, Merge, Scissors, Settings2, Subtitles, Type, Grid, Sparkles, AlertCircle } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function TranscriptPanelV2() {
  const {
    segments,
    currentTime,
    searchQuery,
    setSearchQuery,
    setCurrentTime,
    selectedWordIds,
    toggleWordSelection,
    splitSegment,
    mergeSegments,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'CC' | 'Text' | 'Grid' | 'AI'>('CC');

  // Filter segments
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  return (
    <div className="flex h-full w-full bg-[#18181B] overflow-hidden">
      {/* 40px vertical tool rail */}
      <div className="w-[40px] shrink-0 border-r border-[#27272A] bg-[#0E0E10] flex flex-col items-center py-2 gap-2">
        <button 
          onClick={() => setActiveTab('CC')}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'CC' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
          title="Captions"
        >
          <Subtitles className="h-4 w-4" />
        </button>
        <button 
          onClick={() => setActiveTab('Text')}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'Text' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
          title="Text Tools"
        >
          <Type className="h-4 w-4" />
        </button>
        <button 
          onClick={() => setActiveTab('Grid')}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'Grid' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
          title="Media Grid"
        >
          <Grid className="h-4 w-4" />
        </button>
        <button 
          onClick={() => setActiveTab('AI')}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'AI' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
          title="AI Tools"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 p-3 border-b border-[#27272A] shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E0E10] border border-[#27272A] rounded h-[28px] pl-8 pr-3 text-[12px] text-white focus:outline-none focus:border-[#7C3AED] transition-colors placeholder:text-zinc-500"
            />
          </div>
          <button className="flex items-center gap-1.5 h-[28px] px-2 rounded border border-[#27272A] bg-[#0E0E10] hover:bg-[#27272A] text-zinc-300 transition-colors">
            <span>Caption Tools</span>
            <Settings2 className="h-3 w-3" />
          </button>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272A] bg-[#18181B] shrink-0">
          <div className="flex items-center gap-1">
            <button className="h-[24px] px-2 rounded hover:bg-[#27272A] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              <SplitSquareHorizontal className="h-3 w-3" />
              <span>Split</span>
            </button>
            <button className="h-[24px] px-2 rounded hover:bg-[#27272A] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              <Merge className="h-3 w-3" />
              <span>Merge</span>
            </button>
          </div>
          <div className="flex items-center bg-[#0E0E10] border border-[#27272A] rounded p-0.5">
            <button className="px-3 py-0.5 rounded-sm bg-[#27272A] text-white font-medium">Word</button>
            <button className="px-3 py-0.5 rounded-sm text-zinc-400 hover:text-white">Line</button>
          </div>
        </div>

        {/* Segments List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSegments.map((segment, index) => {
            const isActive = currentTime >= segment.start && currentTime <= segment.end;
            
            return (
              <div 
                key={segment.id}
                className={`flex gap-3 p-2.5 rounded border transition-all ${
                  isActive 
                    ? 'bg-[#27272A] border-[#7C3AED]' 
                    : 'bg-[#0E0E10] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex flex-col items-center gap-1 shrink-0 w-[42px]">
                  <span className={`text-[10px] font-bold ${isActive ? 'text-[#7C3AED]' : 'text-zinc-500'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatTime(segment.start)}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-wrap gap-1.5 items-start">
                  {segment.words.map((word) => {
                    const isWordActive = currentTime >= word.start && currentTime <= word.end;
                    const isSelected = selectedWordIds.includes(word.id);
                    const isLowConfidence = (word.probability ?? 1) < 0.8;
                    
                    return (
                      <button
                        key={word.id}
                        onClick={(e) => {
                          setCurrentTime(word.start);
                          toggleWordSelection(word.id, e.shiftKey || e.metaKey || e.ctrlKey);
                        }}
                        className={`
                          h-[28px] px-2.5 rounded-full flex items-center text-[13px] transition-all cursor-pointer border
                          ${isWordActive || isSelected
                            ? 'bg-[#7C3AED] text-white border-transparent'
                            : 'bg-[#18181B] text-zinc-300 border-[#27272A] hover:bg-[#27272A] hover:text-white'}
                        `}
                      >
                        {word.word}
                        {isLowConfidence && !isWordActive && !isSelected && (
                          <div className="ml-1 w-1 h-1 rounded-full bg-amber-500" title="Low confidence" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {filteredSegments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
              <Search className="h-6 w-6" />
              <p>No segments found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
