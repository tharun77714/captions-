'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import {
  ZoomIn,
  ZoomOut,
  Type,
  Clock,
  Scissors,
  Merge,
  Trash2,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { TimelineWaveform } from '@/components/editor/timeline-waveform';

export function Timeline() {
  const {
    segments,
    waveform,
    currentTime,
    duration,
    isPlaying,
    timelineZoom,
    editMode,
    setTimelineZoom,
    setEditMode,
    setCurrentTime,
    setIsPlaying,
    updateSegmentTiming,
    splitSegment,
    mergeSegments,
    deleteSegment,
  } = useEditorStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Active segment for actions
  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Auto-scroll timeline to keep playhead visible during playback
  useEffect(() => {
    if (scrollContainerRef.current && isPlaying) {
      const container = scrollContainerRef.current;
      const playheadX = currentTime * timelineZoom;
      const containerWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      if (playheadX < scrollLeft + 60 || playheadX > scrollLeft + containerWidth - 60) {
        container.scrollLeft = playheadX - containerWidth / 3;
      }
    }
  }, [currentTime, timelineZoom, isPlaying]);

  // Handle timeline click to seek video
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollContainerRef.current || duration === 0) return;
      if ((e.target as HTMLElement).closest('[data-segment-block]')) return;
      if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      const clickedTime = clickX / timelineZoom;
      setCurrentTime(Math.max(0, Math.min(clickedTime, duration)));
    },
    [duration, timelineZoom, setCurrentTime]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 's':
          if (activeSegment) {
            e.preventDefault();
            splitSegment(activeSegment.id, currentTime);
          }
          break;
        case 'm':
          if (activeSegment) {
            e.preventDefault();
            mergeSegments(activeSegment.id);
          }
          break;
        case 'backspace':
        case 'delete':
          if (activeSegment) {
            e.preventDefault();
            deleteSegment(activeSegment.id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeSegment, currentTime, splitSegment, mergeSegments, deleteSegment, setIsPlaying]);


  // Generate tick marks
  const ticks = useMemo(() => {
    if (duration === 0) return [];
    const tickList: { time: number; isMajor: boolean }[] = [];
    const majorInterval = timelineZoom < 60 ? 5 : timelineZoom < 100 ? 2 : 1;
    const minorInterval = majorInterval / (timelineZoom < 60 ? 1 : 2);

    for (let i = 0; i <= duration; i += minorInterval) {
      tickList.push({
        time: Math.round(i * 100) / 100,
        isMajor: i % majorInterval === 0,
      });
    }
    return tickList;
  }, [duration, timelineZoom]);

  const timelineWidth = Math.max(duration * timelineZoom, 200);

  return (
    <div className="flex flex-col bg-zinc-950 border-t border-white/5 shrink-0 select-none" style={{ height: '220px' }}>
      {/* Premium Toolbar */}
      <div className="flex items-center justify-between px-4 h-11 bg-zinc-900/80 border-b border-white/5 shrink-0 backdrop-blur-md">
        {/* Left: Mode Toggle + Actions */}
        <div className="flex items-center gap-3">
          {/* Line/Word Mode Toggle */}
          <div className="flex bg-zinc-950/80 rounded-md border border-white/10 p-0.5 shadow-inner">
            <button
              onClick={() => setEditMode('line')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-sm transition-all ${
                editMode === 'line'
                  ? 'bg-violet-600/30 text-violet-300 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              LINE
            </button>
            <button
              onClick={() => setEditMode('word')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-sm transition-all ${
                editMode === 'word'
                  ? 'bg-violet-600/30 text-violet-300 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              WORD
            </button>
          </div>

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Edit Actions */}
          <button
            onClick={() => activeSegment && splitSegment(activeSegment.id, currentTime)}
            disabled={!activeSegment}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Split (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            onClick={() => activeSegment && mergeSegments(activeSegment.id)}
            disabled={!activeSegment}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Merge (M)"
          >
            <Merge className="w-3.5 h-3.5" />
            Merge
          </button>
          <button
            onClick={() => activeSegment && deleteSegment(activeSegment.id)}
            disabled={!activeSegment}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded hover:bg-rose-500/20 text-rose-400/80 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Delete (Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Center: Playback Time */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const prev = [...segments].reverse().find(s => s.end <= currentTime);
              if (prev) setCurrentTime(prev.start);
              else setCurrentTime(0);
            }}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Previous Segment"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <div className="text-xs font-mono tabular-nums bg-zinc-950 px-3 py-1 rounded-full border border-white/5 shadow-inner">
            <span className="text-violet-300 font-semibold">{formatTime(currentTime)}</span>
            <span className="text-zinc-600 mx-1.5">/</span>
            <span className="text-zinc-500">{formatTime(duration)}</span>
          </div>
          <button
            onClick={() => {
              const next = segments.find(s => s.start > currentTime);
              if (next) setCurrentTime(next.start);
            }}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Next Segment"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimelineZoom(Math.max(30, timelineZoom - 15))}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="relative w-24 h-6 flex items-center">
            <div className="absolute inset-x-0 h-1.5 bg-zinc-800 rounded-full shadow-inner" />
            <div
              className="absolute h-1.5 bg-violet-600 rounded-full"
              style={{ width: `${((timelineZoom - 30) / 170) * 100}%` }}
            />
            <input
              type="range"
              min="30"
              max="200"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseInt(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none"
              style={{ left: `${((timelineZoom - 30) / 170) * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <button
            onClick={() => setTimelineZoom(Math.min(200, timelineZoom + 15))}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex flex-1 min-h-0 bg-zinc-950">
        {/* Track Labels */}
        <div className="w-24 border-r border-white/5 bg-zinc-900/50 flex flex-col shrink-0 z-20 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
          <div className="h-8 border-b border-white/5" />
          <div className="flex-1 flex flex-col">
            <div className="h-20 flex items-center pl-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audio</span>
            </div>
            <div className="flex-1 flex items-center pl-4 border-t border-white/5 bg-violet-950/10">
              <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-wider">
                {editMode === 'line' ? 'Captions' : 'Words'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Tracks */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
          onClick={handleTimelineClick}
          style={{ cursor: 'text' }}
        >
          <div
            className="h-full relative"
            style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
          >
            {/* 1. Time Ruler */}
            <div className="h-8 border-b border-white/5 relative bg-zinc-900/50">
              {ticks.map(({ time, isMajor }) => (
                <div
                  key={time}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: `${time * timelineZoom}px`, transform: 'translateX(-50%)' }}
                >
                  {isMajor && (
                    <span className="text-[10px] font-mono text-zinc-500 mb-1 tabular-nums">
                      {formatTimeShort(time)}
                    </span>
                  )}
                  <div
                    className={`w-px ${isMajor ? 'h-2 bg-zinc-500' : 'h-1 bg-zinc-700'}`}
                  />
                </div>
              ))}
            </div>

            {/* 2. Waveform Track */}
            <div className="absolute left-0 right-0" style={{ top: '32px', height: '80px' }}>
              <TimelineWaveform
                timelineZoom={timelineZoom}
                duration={duration}
                waveform={waveform}
                currentTime={currentTime}
              />
            </div>

            {/* 3. Caption Block Track */}
            <div className="absolute left-0 right-0 bottom-0" style={{ top: '112px' }}>
              {segments.map((seg) => (
                <DraggableSegment
                  key={seg.id}
                  seg={seg}
                  isActive={currentTime >= seg.start && currentTime <= seg.end}
                  timelineZoom={timelineZoom}
                  setCurrentTime={setCurrentTime}
                  updateSegmentTiming={updateSegmentTiming}
                  editMode={editMode}
                  currentTime={currentTime}
                />
              ))}
            </div>

            {/* 4. Playhead (Premium Polygon Design) */}
            <div
              className="absolute top-0 bottom-0 z-40 pointer-events-none"
              style={{ left: `${currentTime * timelineZoom}px` }}
            >
              {/* Tooltip Flag */}
              <div className="absolute top-0 -translate-x-1/2 px-1.5 py-0.5 bg-rose-500 rounded-b shadow-lg shadow-rose-500/40 text-[9px] font-mono font-bold text-white flex flex-col items-center">
                 {formatTimeShort(currentTime)}
                 <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-rose-500 absolute -bottom-[4px]" />
              </div>
              {/* Line */}
              <div className="absolute top-5 bottom-0 w-[1.5px] bg-rose-500 -translate-x-[0.5px] shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Draggable Segment Block ─────────────────────────────────────────

function DraggableSegment({
  seg,
  isActive,
  timelineZoom,
  setCurrentTime,
  updateSegmentTiming,
  editMode,
  currentTime,
}: {
  seg: { id: number; start: number; end: number; text: string; words: {id: string, start: number, end: number, word: string}[] };
  isActive: boolean;
  timelineZoom: number;
  setCurrentTime: (t: number) => void;
  updateSegmentTiming: (id: number, start: number, end: number) => void;
  editMode: 'line' | 'word';
  currentTime: number;
}) {
  const [dragOffset, setDragOffset] = React.useState(0);
  const [resizeStartOffset, setResizeStartOffset] = React.useState(0);
  const [resizeEndOffset, setResizeEndOffset] = React.useState(0);
  const [interactionState, setInteractionState] = React.useState<
    'none' | 'dragging' | 'resizing-start' | 'resizing-end'
  >('none');

  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'drag' | 'resizing-start' | 'resizing-end'
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialStart = seg.start;
    const initialEnd = seg.end;
    let currentDelta = 0;

    setInteractionState(type === 'drag' ? 'dragging' : type);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      currentDelta = deltaX / timelineZoom;

      if (type === 'drag') setDragOffset(currentDelta);
      else if (type === 'resizing-start') setResizeStartOffset(currentDelta);
      else if (type === 'resizing-end') setResizeEndOffset(currentDelta);
    };

    const onPointerUp = () => {
      setInteractionState('none');
      setDragOffset(0);
      setResizeStartOffset(0);
      setResizeEndOffset(0);

      if (Math.abs(currentDelta) > 0.05) {
        if (type === 'drag') {
          updateSegmentTiming(seg.id, initialStart + currentDelta, initialEnd + currentDelta);
        } else if (type === 'resizing-start') {
          const newStart = Math.min(initialStart + currentDelta, initialEnd - 0.1);
          updateSegmentTiming(seg.id, newStart, initialEnd);
        } else if (type === 'resizing-end') {
          const newEnd = Math.max(initialEnd + currentDelta, initialStart + 0.1);
          updateSegmentTiming(seg.id, initialStart, newEnd);
        }
      } else if (type === 'drag') {
        setCurrentTime(seg.start);
      }

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const currentStart = seg.start + dragOffset + resizeStartOffset;
  const currentEnd = seg.end + dragOffset + resizeEndOffset;
  const left = currentStart * timelineZoom;
  const width = Math.max(10, (currentEnd - currentStart) * timelineZoom);
  const isInteracting = interactionState !== 'none';

  return (
    <>
      {/* Ghost Element during drag to show original position */}
      {interactionState === 'dragging' && (
        <div
          className="absolute bg-white/5 border border-white/10 rounded-lg pointer-events-none"
          style={{
            left: `${seg.start * timelineZoom}px`,
            width: `${Math.max(10, (seg.end - seg.start) * timelineZoom)}px`,
            top: '8px',
            bottom: '8px',
          }}
        />
      )}

      <div
        data-segment-block
        onPointerDown={(e) => handlePointerDown(e, 'drag')}
        className={`absolute rounded-lg flex flex-col justify-center border select-none group transition-all overflow-hidden ${
          isActive || isInteracting
            ? 'bg-violet-600/30 border-violet-400/80 text-white z-30 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
            : 'bg-zinc-800/40 border-white/10 hover:border-violet-400/40 hover:bg-zinc-700/50 text-zinc-300 z-10'
        }`}
        style={{
          left: `${Math.max(0, left)}px`,
          width: `${width}px`,
          top: '8px',
          bottom: '8px',
          cursor: interactionState === 'dragging' ? 'grabbing' : 'grab',
        }}
      >
        {/* Left Resize Handle */}
        <div
          data-resize-handle
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-40 bg-gradient-to-r from-black/20 to-transparent flex items-center justify-start pl-1"
          onPointerDown={(e) => handlePointerDown(e, 'resizing-start')}
        >
          <div className="w-1 h-4 bg-white/80 rounded-full shadow-sm" />
          {interactionState === 'resizing-start' && (
             <div className="absolute -top-6 left-0 bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                {currentStart.toFixed(2)}s
             </div>
          )}
        </div>

        {/* Text / Word Mode Rendering */}
        <div className="flex-1 w-full h-full relative overflow-hidden flex items-center px-3">
          {editMode === 'line' ? (
            <span className="text-[11px] font-medium truncate w-full pointer-events-none drop-shadow-md">
              {seg.text}
            </span>
          ) : (
             <div className="flex items-center w-full h-full relative">
                {seg.words.map((w, i) => {
                   // Calculate proportional width and position inside the parent container
                   const segDuration = seg.end - seg.start;
                   if (segDuration <= 0) return null;
                   
                   const wordRelStart = w.start - seg.start;
                   const wordDuration = w.end - w.start;
                   
                   const wordLeftPct = (wordRelStart / segDuration) * 100;
                   const wordWidthPct = (wordDuration / segDuration) * 100;
                   const isWordActive = currentTime >= w.start && currentTime <= w.end;

                   return (
                     <button
                        key={i}
                        data-segment-block
                        onClick={(e) => {
                           e.stopPropagation();
                           setCurrentTime(w.start);
                        }}
                        className={`absolute h-[60%] rounded flex items-center justify-center transition-colors border border-transparent ${
                           isWordActive ? 'bg-violet-400 text-white font-bold shadow border-violet-300' : 'bg-white/10 hover:bg-white/20 text-white/80'
                        }`}
                        style={{
                           left: `${wordLeftPct}%`,
                           width: `${wordWidthPct}%`,
                        }}
                        title={`${w.word} (${w.start.toFixed(2)}s)`}
                     >
                        <span className="text-[9px] truncate px-1 drop-shadow-sm">{w.word}</span>
                     </button>
                   );
                })}
             </div>
          )}
        </div>

        {/* Right Resize Handle */}
        <div
          data-resize-handle
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-40 bg-gradient-to-l from-black/20 to-transparent flex items-center justify-end pr-1"
          onPointerDown={(e) => handlePointerDown(e, 'resizing-end')}
        >
          <div className="w-1 h-4 bg-white/80 rounded-full shadow-sm" />
          {interactionState === 'resizing-end' && (
             <div className="absolute -top-6 right-0 bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                {currentEnd.toFixed(2)}s
             </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
