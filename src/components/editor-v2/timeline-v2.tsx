'use client';

import React, { useMemo } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function TimelineV2() {
  const {
    segments,
    currentTime,
    duration,
    timelineZoom,
    setTimelineZoom,
    setCurrentTime,
  } = useEditorStore();

  const timelineWidth = Math.max(duration * timelineZoom, 800);

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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const clickedTime = clickX / timelineZoom;
    setCurrentTime(Math.max(0, Math.min(clickedTime, duration)));
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0E10] select-none text-[12px] text-zinc-400">
      
      {/* Timeline Controls (Top Bar) */}
      <div className="flex items-center justify-between px-3 h-[28px] border-b border-[#27272A] bg-[#18181B] shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-zinc-300">{formatTime(currentTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTimelineZoom(Math.max(10, timelineZoom - 10))}
            className="hover:text-white"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-16 text-center text-[10px]">{Math.round(timelineZoom)}x</span>
          <button 
            onClick={() => setTimelineZoom(Math.min(200, timelineZoom + 10))}
            className="hover:text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tracks Area */}
      <div 
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onClick={handleTimelineClick}
      >
        <div 
          className="relative h-full" 
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Ruler */}
          <div className="absolute top-0 left-0 w-full h-[16px] border-b border-[#27272A]">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${tick.time * timelineZoom}px` }}
              >
                <div className={`w-px bg-zinc-600 ${tick.isMajor ? 'h-1.5' : 'h-1'}`} />
                {tick.isMajor && (
                  <span className="text-[9px] mt-0.5 text-zinc-500 font-mono scale-90">
                    {formatTime(tick.time)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Caption Track (24px) */}
          <div className="absolute top-[20px] left-0 w-full h-[24px] bg-[#18181B] border-y border-[#27272A]">
            {segments.map(seg => (
              <div 
                key={seg.id}
                className="absolute top-0 h-full bg-[#7C3AED]/20 border border-[#7C3AED]/50 rounded-sm hover:bg-[#7C3AED]/30 transition-colors"
                style={{
                  left: `${seg.start * timelineZoom}px`,
                  width: `${(seg.end - seg.start) * timelineZoom}px`
                }}
              />
            ))}
          </div>

          {/* Video Track (24px) */}
          <div className="absolute top-[48px] left-0 w-full h-[24px] bg-[#18181B] border-b border-[#27272A]">
             <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-blue-500/10 flex overflow-hidden">
                {/* Dummy video frames */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-[40px] h-full border-r border-[#27272A] bg-zinc-800 shrink-0" />
                ))}
             </div>
          </div>

          {/* Audio Track (24px) */}
          <div className="absolute top-[76px] left-0 w-full h-[24px] bg-[#18181B] border-b border-[#27272A]">
             <div className="absolute top-0 left-0 w-full h-full bg-teal-500/20" />
          </div>

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-[#7C3AED] pointer-events-none z-10"
            style={{ left: `${currentTime * timelineZoom}px` }}
          >
            <div className="absolute -top-[5px] -translate-x-1/2 w-2.5 h-2.5 bg-[#7C3AED] rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}
