'use client';

import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useEditorStore } from '@/store/editor-store';
import { CaptionBlock, Line } from '@/lib/caption-composition';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { CaptionOverlay } from './CaptionOverlay';

/**
 * Measured subtitle rendering data captured directly from the browser DOM.
 * These values are the source of truth for the export pipeline.
 * No estimation. No reference heights. Actual rendered pixels.
 */
export interface RenderedMeasurements {
  // Container dimensions (the video preview area)
  containerWidth: number;
  containerHeight: number;
  // Native video dimensions
  videoWidth: number;
  videoHeight: number;
  // The exact scale ratio: nativeVideoHeight / containerHeight
  // Multiply any CSS px value by this to get the native video coordinate
  scaleFactor: number;
  // Subtitle box: actual rendered CSS pixel values
  fontSize: number;       // computed CSS fontSize in px
  lineHeight: number;     // computed CSS lineHeight in px
  paddingTop: number;     // computed CSS paddingTop in px
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  maxWidth: number;       // computed CSS maxWidth in px (85% of container)
  // Position: actual distance from container edge in CSS px
  bottomOffset: number;   // distance from container bottom to subtitle bottom
  // These are passed through as-is (not px values)
  fontFamily: string;
  fontWeight: number;
  fontItalic: boolean;
  fontUnderline: boolean;
  fontTextTransform: string;
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  alignment: string;
  position: string;
  positionX: number;
  positionY: number;
  highlightMode: string;
  activeWordColor: string;
  inactiveOpacity: number;
  blur: number;
  borderRadius: number;   // computed CSS borderRadius in px
  transition: {
    type: string;
    target: string;
    speedMode: string;
    speed: number;
  };
  layouts?: any[];        // Exact word positions for every segment
}

export interface VideoPlayerRef {
  getRenderedMeasurements: () => RenderedMeasurements | null;
  getVideoMetadata: () => { width: number; height: number; duration: number } | null;
}

export const VideoPlayer = forwardRef<VideoPlayerRef>(function VideoPlayer(_props, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const subtitleBoxRef = useRef<HTMLSpanElement>(null);
  const hiddenMeasureRef = useRef<HTMLDivElement>(null);
  const {
    videoUrl,
    currentTime,
    isPlaying,
    segments,
    computedBlocks,
    useCompositionRenderer,
    compositionDiagnostics,
    subtitleStyle,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setActiveSegmentIndex,
    setSubtitleStyleV2,
  } = useEditorStore();

  const isExportMode = typeof window !== 'undefined' && (window as any).__EXPORT_MODE__;
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoDimensions, setVideoDimensions] = useState({ width: 16, height: 9 });
  const [mountedSegments, setMountedSegments] = useState<Record<string, boolean>>({});
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose measurement function to parent via ref
  useImperativeHandle(ref, () => ({
    getRenderedMeasurements: (): RenderedMeasurements | null => {
      const container = containerRef.current;
      const video = videoRef.current;
      const subtitleBox = subtitleBoxRef.current;

      if (!container || !video) return null;

      const containerRect = container.getBoundingClientRect();
      const nativeW = video.videoWidth || 1920;
      const nativeH = video.videoHeight || 1080;

      const nativeRatio = nativeW / nativeH;
      const containerRatio = containerRect.width / containerRect.height;
      
      let actualVideoWidth, actualVideoHeight, videoLeftOffset, videoTopOffset;
      
      if (containerRatio > nativeRatio) {
        // Container is wider than video (pillarboxing on sides)
        actualVideoHeight = containerRect.height;
        actualVideoWidth = actualVideoHeight * nativeRatio;
        videoTopOffset = 0;
        videoLeftOffset = (containerRect.width - actualVideoWidth) / 2;
      } else {
        // Container is taller than video (letterboxing on top/bottom)
        actualVideoWidth = containerRect.width;
        actualVideoHeight = actualVideoWidth / nativeRatio;
        videoLeftOffset = 0;
        videoTopOffset = (containerRect.height - actualVideoHeight) / 2;
      }

      // The exact scale factor: how many native pixels per CSS pixel of the ACTUAL video
      const scaleFactor = nativeH / actualVideoHeight;

      // Measure subtitle box if it exists, otherwise use style defaults
      let fontSize = subtitleStyle.fontSize;
      let lineHeight = subtitleStyle.fontSize * 1.375;
      let paddingTop = 6;
      let paddingBottom = 6;
      let paddingLeft = 12;
      let paddingRight = 12;
      let maxWidth = containerRect.width * 0.85;
      let bottomOffset = 64;
      let borderRadius = 6;

      if (subtitleBox) {
        const cs = getComputedStyle(subtitleBox);
        fontSize = parseFloat(cs.fontSize);
        lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.375;
        paddingTop = parseFloat(cs.paddingTop);
        paddingBottom = parseFloat(cs.paddingBottom);
        paddingLeft = parseFloat(cs.paddingLeft);
        paddingRight = parseFloat(cs.paddingRight);
        maxWidth = parseFloat(cs.maxWidth) || containerRect.width * 0.85;
        borderRadius = parseFloat(cs.borderRadius) || 6;

        // Measure actual bottom offset
        const boxRect = subtitleBox.getBoundingClientRect();
        bottomOffset = containerRect.bottom - boxRect.bottom;
      }

      // Collect precise pixel layout for all segments
      const layouts: any[] = [];
      const measureContainer = hiddenMeasureRef.current;
      if (measureContainer) {
        const segSpans = measureContainer.querySelectorAll('[data-measure-segment]');
        segSpans.forEach(segSpan => {
           const words: any[] = [];
           const wordSpans = segSpan.querySelectorAll('[data-measure-word]');
           wordSpans.forEach(wSpan => {
              const wRect = wSpan.getBoundingClientRect();
              words.push({
                 word: wSpan.textContent || '',
                 x: wRect.left - containerRect.left - videoLeftOffset,
                 y: wRect.top - containerRect.top - videoTopOffset,
                 w: wRect.width,
                 h: wRect.height
              });
           });
           const segRect = segSpan.getBoundingClientRect();
           layouts.push({ 
             words,
             box: {
               x: segRect.left - containerRect.left - videoLeftOffset,
               y: segRect.top - containerRect.top - videoTopOffset,
               w: segRect.width,
               h: segRect.height
             }
           });
        });
      }

      return {
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        videoWidth: nativeW,
        videoHeight: nativeH,
        scaleFactor,
        fontSize,
        lineHeight,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
        maxWidth,
        bottomOffset,
        fontFamily: subtitleStyle.font.family,
        fontWeight: subtitleStyle.font.weight,
        textColor: subtitleStyle.textColor.solid,
        backgroundColor: subtitleStyle.background.color,
        strokeColor: subtitleStyle.stroke.color,
        strokeWidth: subtitleStyle.stroke.width,
        shadowColor: subtitleStyle.shadow.color,
        shadowBlur: subtitleStyle.shadow.blur,
        shadowOffsetX: subtitleStyle.shadow.offsetX,
        shadowOffsetY: subtitleStyle.shadow.offsetY,
        alignment: subtitleStyle.alignment,
        position: subtitleStyle.positionY > 0 ? 'top' : subtitleStyle.positionY < 0 ? 'bottom' : 'center',
        positionX: subtitleStyle.positionX,
        positionY: subtitleStyle.positionY,
        highlightMode: subtitleStyle.highlightMode,
        activeWordColor: subtitleStyle.activeWordColor,
        inactiveOpacity: subtitleStyle.inactiveOpacity,
        letterSpacing: subtitleStyle.letterSpacing,
        wordSpacing: subtitleStyle.wordSpacing,
        lineSpacing: subtitleStyle.lineSpacing,
        blur: subtitleStyle.blur,
        fontItalic: subtitleStyle.font.italic,
        fontUnderline: subtitleStyle.font.underline,
        fontTextTransform: subtitleStyle.font.textTransform,
        transition: subtitleStyle.transition,
        borderRadius,
        layouts,
      };
    },
    getVideoMetadata: () => {
      const video = videoRef.current;
      if (!video) return null;
      return {
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        duration: video.duration || 0,
      };
    }
  }));

  // Dynamic Google Font Loader
  useEffect(() => {
    const font = subtitleStyle.font?.family || 'Inter';
    const safeFonts = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Courier New'];
    if (!font || safeFonts.includes(font)) return;

    const fontId = `google-font-${font.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;700;900&display=swap`;
      document.head.appendChild(link);
    }

    const teluguFontId = 'google-font-noto-sans-telugu';
    if (!document.getElementById(teluguFontId)) {
      const link2 = document.createElement('link');
      link2.id = teluguFontId;
      link2.rel = 'stylesheet';
      link2.href = `https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=swap`;
      document.head.appendChild(link2);
    }
  }, [subtitleStyle.font.family]);

  // Find active segment based on current time
  const activeSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  const activeBlock = computedBlocks.find(
    (b) => currentTime >= b.start && currentTime <= b.end
  );

  if (useCompositionRenderer && activeBlock) {
    if (currentTime < activeBlock.start || currentTime > activeBlock.end) {
      console.warn('Assertion failed: activeBlock timing mismatch', { currentTime, activeBlock });
    }
  }


  const activeSegmentWords = React.useMemo(() => {
    return activeSegment ? activeSegment.words : [];
  }, [activeSegment]);

  const activeId = useCompositionRenderer ? activeBlock?.id : activeSegment?.id;
  
  // Ensure segment is mounted before applying active styles, to trigger CSS transitions
  useEffect(() => {
    if (activeId && !mountedSegments[activeId]) {
      const timer = setTimeout(() => {
        setMountedSegments(prev => ({ ...prev, [activeId]: true }));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [activeId, mountedSegments]);

  // Sync video time → store
  const handleTimeUpdate = useCallback(() => {
    if (isExportMode) return;
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      const idx = segments.findIndex(
        (seg) => time >= seg.start && time <= seg.end
      );
      setActiveSegmentIndex(idx);
    }
  }, [isExportMode, segments, setCurrentTime, setActiveSegmentIndex]);

  // Sync store time → video (seek from transcript clicks)
  useEffect(() => {
    if (isExportMode) return;
    if (videoRef.current && videoRef.current.readyState >= 1 && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [isExportMode, currentTime]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoDimensions({
        width: videoRef.current.videoWidth || 16,
        height: videoRef.current.videoHeight || 9,
      });
    }
  }, [setDuration]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) videoRef.current.volume = val;
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.volume = newMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [setCurrentTime]);




  return (
    <div
      ref={containerRef}
      id="video-player-container"
      className="relative bg-black rounded-xl overflow-hidden shadow-2xl group flex items-center justify-center max-w-full max-h-full"
      style={{ aspectRatio: isExportMode ? "9 / 16" : `${videoDimensions.width} / ${videoDimensions.height}` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
      ) : (
        !isExportMode && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 text-sm">No video source available</p>
          </div>
        )
      )}

      {/* Hidden Layout Measurement Container */}
      <div
        ref={hiddenMeasureRef}
        className="absolute left-0 right-0 pointer-events-none opacity-0 top-1/2"
        style={{
          justifyContent: subtitleStyle.alignment === 'left' ? 'flex-start' : subtitleStyle.alignment === 'right' ? 'flex-end' : 'center',
          padding: '0 24px',
          zIndex: -1,
          transform: `translateX(${subtitleStyle.positionX}%)`,
        }}
      >
        {useCompositionRenderer ? computedBlocks.map((block, bIdx) => (
          <span
            key={bIdx}
            data-measure-segment={bIdx}
            className="px-3 py-1.5 rounded-md text-center absolute top-0"
            style={{
              fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", "Noto Sans Arabic", "Noto Sans JP", sans-serif`,
              fontSize: `${subtitleStyle.fontSize}px`,
              fontWeight: subtitleStyle.font.weight,
              letterSpacing: `${subtitleStyle.letterSpacing}px`,
              wordSpacing: `${subtitleStyle.wordSpacing}px`,
              lineHeight: subtitleStyle.lineSpacing,
            }}
          >
            {block.lines.map((line, lIdx) => (
              <div key={lIdx} data-measure-line={lIdx} style={{ display: 'block', whiteSpace: 'nowrap' }}>
                {line.words.map((w, wIdx) => (
                  <span key={wIdx} data-measure-word={wIdx} style={{ marginRight: '6px', display: 'inline-block', padding: '0 2px' }}>
                    {w.word.trim()}
                  </span>
                ))}
              </div>
            ))}
          </span>
        )) : segments.map((seg, sIdx) => (
          <span
            key={sIdx}
            data-measure-segment={sIdx}
            className="px-3 py-1.5 rounded-md max-w-[85%] text-center absolute top-0"
            style={{
              fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", "Noto Sans Arabic", "Noto Sans JP", sans-serif`,
              fontSize: `${subtitleStyle.fontSize}px`,
              fontWeight: subtitleStyle.font.weight,
              letterSpacing: `${subtitleStyle.letterSpacing}px`,
              wordSpacing: `${subtitleStyle.wordSpacing}px`,
              lineHeight: subtitleStyle.lineSpacing,
            }}
          >
            {seg.words.length > 0 ? seg.words.map((w, wIdx) => (
              <span key={wIdx} data-measure-word={wIdx} style={{ marginRight: '6px', display: 'inline-block', padding: '0 2px' }}>
                {w.word.trim()}
              </span>
            )) : <span data-measure-word={0}>{seg.text}</span>}
          </span>
        ))}
      </div>

      {/* Subtitle Overlay */}
      {(useCompositionRenderer ? activeBlock : activeSegment) && (
        <motion.div
          drag
          dragMomentum={false}
          onDragEnd={(e, info) => {
            if (!containerRef.current || !subtitleBoxRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const boxRect = subtitleBoxRef.current.getBoundingClientRect();
            
            const newCenterX = boxRect.left + boxRect.width / 2;
            const newCenterY = boxRect.top + boxRect.height / 2;
            
            const containerCenterX = containerRect.left + containerRect.width / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;

            const percentX = ((newCenterX - containerCenterX) / containerRect.width) * 100;
            const percentY = ((newCenterY - containerCenterY) / containerRect.height) * 100;

            setSubtitleStyleV2(prev => ({
              ...prev,
              positionX: Math.max(-50, Math.min(50, percentX)),
              positionY: Math.max(-50, Math.min(50, percentY))
            }));
          }}
          className="absolute pointer-events-none"
          style={{
            top: `${50 + subtitleStyle.positionY}%`,
            left: `${50 + subtitleStyle.positionX}%`,
            x: 0,
            y: 0,
            zIndex: 50,
          }}
        >
          <CaptionOverlay
            ref={subtitleBoxRef}
            currentTime={currentTime}
            subtitleStyle={subtitleStyle}
            activeBlock={activeBlock}
            activeSegment={activeSegment}
            useCompositionRenderer={useCompositionRenderer}
            isExportMode={isExportMode}
            isLineMounted={
              useCompositionRenderer
                ? (activeBlock ? mountedSegments[activeBlock.id] === true : false)
                : (activeSegment ? mountedSegments[activeSegment.id] === true : false)
            }
          >
            {!isExportMode && (
              <div 
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-violet-600 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg hover:scale-110"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!subtitleBoxRef.current) return;
                  
                  const boxRect = subtitleBoxRef.current.getBoundingClientRect();
                  const centerX = boxRect.left + boxRect.width / 2;
                  const centerY = boxRect.top + boxRect.height / 2;
                  
                  const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
                  const startFontSize = subtitleStyle.fontSize;
                  
                  const handlePointerMove = (moveEv: PointerEvent) => {
                    const currentDist = Math.hypot(moveEv.clientX - centerX, moveEv.clientY - centerY);
                    if (startDist === 0) return;
                    const scale = currentDist / startDist;
                    
                    const newSize = Math.max(12, Math.min(300, startFontSize * scale));
                    setSubtitleStyleV2(prev => ({ ...prev, fontSize: Math.round(newSize) }));
                  };
                  
                  const handlePointerUp = () => {
                    window.removeEventListener('pointermove', handlePointerMove);
                    window.removeEventListener('pointerup', handlePointerUp);
                  };
                  
                  window.addEventListener('pointermove', handlePointerMove);
                  window.addEventListener('pointerup', handlePointerUp);
                }}
              >
                <div className="w-2 h-2 bg-white rounded-full pointer-events-none" />
              </div>
            )}
          </CaptionOverlay>
        </motion.div>
      )}

      
      {/* Diagnostics Overlay */}
      {!isExportMode && (
        <div className="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col gap-2">
          <button
            onClick={() => useEditorStore.getState().setUseCompositionRenderer(!useCompositionRenderer)}
            className="bg-black/80 hover:bg-black text-white text-xs font-mono px-3 py-1.5 rounded border border-white/20 transition-colors shadow-lg"
          >
            Renderer: {useCompositionRenderer ? 'Composition (v2)' : 'Legacy (v1)'}
          </button>
          
          {useCompositionRenderer && (
            <div className="bg-black/80 text-white text-xs font-mono p-4 rounded text-left border border-white/10 shadow-lg pointer-events-none">
               <div className="text-violet-400 font-bold mb-2">COMPOSITION DIAGNOSTICS</div>
               <div>Active Block: {activeBlock?.id || 'None'}</div>
               <div>Active Segment: {activeSegment?.id || 'None'}</div>
               <div className="mt-1 text-white/70">Performance</div>
               <div>Compose: {compositionDiagnostics?.composeTimeMs.toFixed(2) || 0}ms</div>
               <div>Layout v{compositionDiagnostics?.layoutVersion || 1}</div>
               <div>Preset: {compositionDiagnostics?.preset || 'None'}</div>
            </div>
          )}
        </div>
      )}


      
      {/* Diagnostics Overlay */}
      {useCompositionRenderer && !isExportMode && (
        <div className="absolute top-4 left-4 bg-black/80 text-white text-xs font-mono p-4 rounded z-50 pointer-events-none text-left">
           <div className="text-violet-400 font-bold mb-2">COMPOSITION DIAGNOSTICS</div>
           <div>Renderer: Composition</div>
           <div>Active Block: {activeBlock?.id || 'None'}</div>
           <div>Active Segment: {activeSegment?.id || 'None'}</div>
           <div>Compose Time: {compositionDiagnostics?.composeTimeMs.toFixed(2) || 0}ms</div>
           <div>Layout Version: {compositionDiagnostics?.layoutVersion || 1}</div>
           <div>Preset: {compositionDiagnostics?.preset || 'None'}</div>
        </div>
      )}

      {/* Custom Controls */}
      {!isExportMode && (
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-violet-500 rounded-full relative transition-all"
            style={{
              width: videoRef.current?.duration
                ? `${(currentTime / videoRef.current.duration) * 100}%`
                : '0%',
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 accent-violet-500"
              />
            </div>

            <span className="text-xs text-white/60 font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration ?? 0)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {!isPlaying && videoUrl && !isExportMode && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
});

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
