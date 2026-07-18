'use client';

import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useEditorStore } from '@/store/editor-store';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { computeDurationMs, getCSSTransitionParams } from '@/lib/transition-engine';
import { resolveWordStyle } from '@/lib/subtitle-schema-v3';

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

  const activeSegmentWords = React.useMemo(() => {
    return activeSegment ? activeSegment.words : [];
  }, [activeSegment]);

  // Ensure segment is mounted before applying active styles, to trigger CSS transitions
  useEffect(() => {
    if (activeSegment && !mountedSegments[activeSegment.id]) {
      const timer = setTimeout(() => {
        setMountedSegments(prev => ({ ...prev, [activeSegment.id]: true }));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [activeSegment, mountedSegments]);

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

  // Subtitle position: direct CSS values using top/left percentages

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
            <p className="text-zinc-600 text-sm">Loading video...</p>
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
        {segments.map((seg, sIdx) => (
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
      {activeSegment && (
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
          <div style={{ transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span
              ref={subtitleBoxRef}
              className="px-3 py-1.5 rounded-md max-w-full whitespace-pre-wrap pointer-events-auto cursor-move hover:ring-2 hover:ring-violet-500/50 transition-shadow"
            style={{
              fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", "Noto Sans Arabic", "Noto Sans JP", sans-serif`,
              fontSize: `${subtitleStyle.fontSize}px`,
              fontWeight: subtitleStyle.font.weight,
              letterSpacing: `${subtitleStyle.letterSpacing}px`,
              wordSpacing: `${subtitleStyle.wordSpacing}px`,
              lineHeight: subtitleStyle.lineSpacing,
              textAlign: subtitleStyle.alignment,
              color: subtitleStyle.textColor.solid,
              backgroundColor: subtitleStyle.background.enabled ? subtitleStyle.background.color : 'transparent',
              textShadow: subtitleStyle.shadow.blur > 0 ? `0 0 ${subtitleStyle.shadow.blur}px ${subtitleStyle.shadow.color}` : undefined,
              WebkitTextStroke: subtitleStyle.stroke.enabled && subtitleStyle.stroke.width > 0 ? `${subtitleStyle.stroke.width}px ${subtitleStyle.stroke.color}` : undefined,
            }}
          >
            {activeSegmentWords.length > 0 ? (
              activeSegmentWords.map((wordObj, i) => {
                const isWordActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
                
                // For target: 'line', animate all words when the segment mounts.
                // For target: 'word', animate each word when its time is reached.
                const isLineMounted = mountedSegments[activeSegment.id] === true;
                const hasStarted = subtitleStyle.transition.target === 'line' 
                  ? isLineMounted 
                  : (isLineMounted && currentTime >= wordObj.start);

                const mode = subtitleStyle.highlightMode || 'none';
                const computedStyle = resolveWordStyle(subtitleStyle, activeSegment.id, wordObj.id);
                
                // 1. Transition Engine
                const durationMs = computeDurationMs(subtitleStyle.transition, wordObj.start, wordObj.end);
                const transitionParams = getCSSTransitionParams(subtitleStyle.transition.type, durationMs);
                
                // Active/Inactive state based on transition
                const transitionState = hasStarted ? transitionParams.activeStyle : transitionParams.initialStyle;

                let exportOverrideStyle: React.CSSProperties = {};

                if (isExportMode && subtitleStyle.transition.type !== 'none') {
                  const animStart = subtitleStyle.transition.target === 'line' ? activeSegment.start : wordObj.start;
                  const animEnd = animStart + (durationMs / 1000.0);
                  let progress = 0;
                  if (currentTime >= animEnd) {
                    progress = 1;
                  } else if (currentTime > animStart) {
                    progress = (currentTime - animStart) / (animEnd - animStart);
                  }

                  const transType = subtitleStyle.transition.type;
                  let tStyle: React.CSSProperties = {};
                  
                  if (transType === 'fade') {
                    tStyle.opacity = progress;
                  } else if (transType === 'pop') {
                    tStyle.transform = `scale(${progress})`;
                    tStyle.opacity = progress > 0 ? 1 : 0;
                  } else if (transType === 'scale') {
                    tStyle.transform = isWordActive ? 'scale(1.15)' : 'scale(1)';
                  } else if (transType === 'slide-left') {
                    tStyle.transform = `translateX(${-20 * (1 - progress)}px)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'slide-right') {
                    tStyle.transform = `translateX(${20 * (1 - progress)}px)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'slide-up') {
                    tStyle.transform = `translateY(${-20 * (1 - progress)}px)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'slide-down') {
                    tStyle.transform = `translateY(${20 * (1 - progress)}px)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'zoom') {
                    tStyle.transform = `scale(${0.5 + 0.5 * progress})`;
                    tStyle.opacity = progress;
                  } else if (transType === 'flip-x') {
                    tStyle.transform = `perspective(400px) rotateX(${90 * (1 - progress)}deg)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'flip-y') {
                    tStyle.transform = `perspective(400px) rotateY(${90 * (1 - progress)}deg)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'spin') {
                    tStyle.transform = `rotate(${180 * (1 - progress)}deg) scale(${progress})`;
                    tStyle.opacity = progress;
                  } else if (transType === 'blur') {
                    tStyle.filter = `blur(${10 * (1 - progress)}px)`;
                    tStyle.opacity = progress;
                  } else if (transType === 'bounce') {
                    tStyle.transform = `translateY(${30 * (1 - progress)}px) scale(${0.8 + 0.2 * progress})`;
                    tStyle.opacity = progress;
                  } else if (transType === 'elastic') {
                    tStyle.transform = `scaleX(${1.5 - 0.5 * progress}) scaleY(${0.5 + 0.5 * progress})`;
                    tStyle.opacity = progress;
                  }

                  exportOverrideStyle = {
                    ...tStyle,
                    transition: 'none',
                  };
                }

                // 2. Base Style
                const dynamicStyle: React.CSSProperties = {
                  color: computedStyle.gradient ? 'transparent' : computedStyle.textColor,
                  backgroundImage: computedStyle.gradient ? `linear-gradient(${computedStyle.gradient.angle}deg, ${computedStyle.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})` : undefined,
                  WebkitBackgroundClip: computedStyle.gradient ? 'text' : undefined,
                  WebkitTextFillColor: computedStyle.gradient ? 'transparent' : undefined,
                  fontFamily: `"${computedStyle.fontFamily}", sans-serif`,
                  fontSize: `${computedStyle.fontSize}px`,
                  fontWeight: computedStyle.fontWeight,
                  fontStyle: computedStyle.italic ? 'italic' : 'normal',
                  textDecoration: computedStyle.underline ? 'underline' : 'none',
                  textTransform: computedStyle.textTransform !== 'none' ? computedStyle.textTransform : undefined,
                  letterSpacing: `${computedStyle.letterSpacing}px`,
                  opacity: hasStarted ? computedStyle.opacity : subtitleStyle.inactiveOpacity ?? 0.5,
                  filter: !hasStarted && subtitleStyle.blur > 0 ? `blur(${subtitleStyle.blur}px)` : undefined,
                  transform: `scale(${computedStyle.scaleX}, ${computedStyle.scaleY}) translate(${computedStyle.x}px, ${computedStyle.y}px) rotate(${computedStyle.rotation}deg)`,
                  backgroundColor: computedStyle.backgroundEnabled ? computedStyle.backgroundColor : 'transparent',
                  marginRight: '6px',
                  display: 'inline-block',
                  transition: isExportMode ? 'none' : `all ${transitionParams.durationMs}ms ${transitionParams.easing}`,
                  padding: `${computedStyle.paddingY ?? 0}px ${computedStyle.paddingX ?? 2}px`,
                  borderRadius: `${computedStyle.borderRadius}px`,
                  ...(isExportMode ? exportOverrideStyle : transitionState), // Apply initial or active transform/opacity
                };

                if (computedStyle.shadowBlur > 0) {
                  dynamicStyle.textShadow = `${computedStyle.shadowOffsetX}px ${computedStyle.shadowOffsetY}px ${computedStyle.shadowBlur}px ${computedStyle.shadowColor}`;
                }
                if (computedStyle.strokeEnabled && computedStyle.strokeWidth > 0) {
                  dynamicStyle.WebkitTextStroke = `${computedStyle.strokeWidth}px ${computedStyle.strokeColor}`;
                }

                // 3. Highlight Mode (only applies while actively spoken)
                if (isWordActive && mode !== 'none') {
                  switch (mode) {
                    case 'color':
                      dynamicStyle.color = subtitleStyle.activeWordColor || '#facc15';
                      dynamicStyle.opacity = 1.0;
                      break;
                    case 'scale':
                      dynamicStyle.transform = 'scale(1.15)';
                      dynamicStyle.opacity = 1.0;
                      break;
                    case 'underline':
                      dynamicStyle.textDecoration = 'underline';
                      dynamicStyle.textUnderlineOffset = '4px';
                      dynamicStyle.opacity = 1.0;
                      break;
                    case 'background':
                      dynamicStyle.backgroundColor = subtitleStyle.activeWordColor || '#facc15';
                      dynamicStyle.color = '#000000';
                      dynamicStyle.opacity = 1.0;
                      break;
                    case 'karaoke':
                      dynamicStyle.color = subtitleStyle.activeWordColor || '#facc15';
                      dynamicStyle.transform = 'scale(1.1)';
                      dynamicStyle.textShadow = `0 0 12px ${subtitleStyle.activeWordColor || '#facc15'}CC`;
                      dynamicStyle.opacity = 1.0;
                      break;
                  }
                }

                return (
                  <span
                    key={wordObj.id}
                    style={dynamicStyle}
                  >
                    {wordObj.word.trim()}
                  </span>
                );
              })
              ) : (
                activeSegment.text
              )}
            </span>
          </div>
        </motion.div>
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
