'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Play, Pause, Maximize2, RefreshCcw, LayoutGrid } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { CaptionOverlay } from '@/components/editor/CaptionOverlay';

interface VideoPlayerV2Props {
  project: { media_url: string };
}

export function VideoPlayerV2({ project }: VideoPlayerV2Props) {
  const { 
    currentTime, 
    isPlaying, 
    setIsPlaying,
    duration,
    setDuration,
    setCurrentTime,
    subtitleStyle,
    segments,
    computedBlocks,
    useCompositionRenderer,
    semanticTags
  } = useEditorStore();

  const activeSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );
  
  const activeBlock = computedBlocks.find(
    (b) => currentTime >= b.start && currentTime <= b.end
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep video time in sync with store
  useEffect(() => {
    if (!videoRef.current) return;
    
    // If state is playing but video is paused, play video
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error(e));
    } 
    // If state is paused but video is playing, pause video
    else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Sync time if difference is greater than 0.1s
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !isPlaying) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col h-full bg-[#0E0E10]">
      {/* Floating Toolbar above Video */}
      <div className="flex items-center justify-center p-3 shrink-0">
        <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-full px-2 py-1 gap-1">
          <button className="px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white rounded-full hover:bg-[#27272A] transition-colors flex items-center gap-1.5">
            <RefreshCcw className="h-3 w-3" /> Replace
          </button>
          <div className="w-px h-3 bg-[#27272A]" />
          <button className="px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white rounded-full hover:bg-[#27272A] transition-colors">
            9:16
          </button>
          <div className="w-px h-3 bg-[#27272A]" />
          <button className="px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white rounded-full hover:bg-[#27272A] transition-colors">
            Safe Zone
          </button>
          <div className="w-px h-3 bg-[#27272A]" />
          <button className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-[#27272A] transition-colors" title="Rule of Thirds">
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-[#27272A] transition-colors" title="Fullscreen">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Video Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        {/* 9:16 Aspect Ratio Container */}
        <div 
          className="relative bg-black shadow-2xl rounded-md overflow-hidden" 
          style={{ aspectRatio: '9/16', maxHeight: '100%', maxWidth: '100%' }}
        >
          <video
            ref={videoRef}
            src={project.media_url}
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            onClick={togglePlay}
          />
          
          {/* Safe Zone Guides (dim teal) */}
          <div className="absolute inset-0 pointer-events-none p-[10%]">
            <div className="w-full h-full border border-teal-500/30 border-dashed rounded-sm" />
          </div>
          
          {/* Caption Overlay with Violet Bounding Box */}
          <div className="absolute inset-0 flex items-end justify-center pb-[10%]">
            <CaptionOverlay 
              currentTime={currentTime}
              subtitleStyle={subtitleStyle}
              activeBlock={activeBlock}
              activeSegment={activeSegment}
              useCompositionRenderer={useCompositionRenderer}
              isExportMode={false}
              isLineMounted={true}
              semanticTags={semanticTags}
            />
          </div>
        </div>
      </div>

      {/* Playback Controls below Video */}
      <div className="p-4 flex flex-col gap-2 shrink-0 border-t border-[#27272A] bg-[#0E0E10]">
        {/* Scrubber */}
        <div className="relative w-full h-[24px] flex items-center group cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          setCurrentTime(p * duration);
        }}>
          <div className="absolute left-0 right-0 h-1 bg-[#27272A] rounded-full overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-[#7C3AED] transition-all duration-75"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          {/* Scrubber thumb */}
          <div 
            className="absolute w-3 h-3 bg-white rounded-full shadow border border-[#18181B] -ml-1.5 transition-all duration-75 group-hover:scale-125"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#18181B] border border-[#27272A] text-white hover:bg-[#27272A] transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <span className="font-mono text-[11px] text-zinc-400">
              <span className="text-white">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
