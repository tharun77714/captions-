import React from 'react';
import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ExportInputProps } from './types';
import { resolveWordStyle } from '@/lib/subtitle-schema-v3';
import { computeDurationMs, getCSSTransitionParams } from '@/lib/transition-engine';

export const CaptionComposition: React.FC<ExportInputProps> = ({
  videoUrl,
  segments,
  subtitleStyle,
  subtitleMode,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // 1. Load fonts dynamically inside the frame to ensure Chromium renders them
  const font = subtitleStyle.font?.family || 'Inter';
  const fontUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;700;900&display=swap`;
  const teluguFontUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=swap`;

  // Find active segment
  const activeSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  const activeSegmentWords = activeSegment ? activeSegment.words : [];

  const renderWord = (wordObj: any, parentId: number) => {
    const isWordActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
    // For Remotion, we treat it exactly like export mode.
    // Line is considered "mounted" (visible) when the current time is within the segment's start/end.
    const isLineMounted = activeSegment ? (currentTime >= activeSegment.start && currentTime <= activeSegment.end) : false;
    const hasStarted = subtitleStyle.transition.target === 'line'
      ? isLineMounted
      : (isLineMounted && currentTime >= wordObj.start);

    const mode = subtitleStyle.highlightMode || 'none';
    const computedStyle = resolveWordStyle(subtitleStyle, parentId, wordObj.id);

    // Transition Engine computation
    const durationMs = computeDurationMs(subtitleStyle.transition, wordObj.start, wordObj.end);
    const transitionParams = getCSSTransitionParams(subtitleStyle.transition.type, durationMs);

    let exportOverrideStyle: React.CSSProperties = {};

    if (subtitleStyle.transition.type !== 'none') {
      const animStart = subtitleStyle.transition.target === 'line' ? (activeSegment?.start ?? wordObj.start) : wordObj.start;
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

    // Base Style
    const dynamicStyle: React.CSSProperties = {
      color: computedStyle.gradient ? 'transparent' : computedStyle.textColor,
      backgroundImage: computedStyle.gradient ? `linear-gradient(${computedStyle.gradient.angle}deg, ${computedStyle.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})` : undefined,
      WebkitBackgroundClip: computedStyle.gradient ? 'text' : undefined,
      WebkitTextFillColor: computedStyle.gradient ? 'transparent' : undefined,
      fontFamily: `"${computedStyle.fontFamily}", "Noto Sans Telugu", sans-serif`,
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
      transition: 'none', // deterministic rendering: no CSS transitions
      padding: `${computedStyle.paddingY ?? 0}px ${computedStyle.paddingX ?? 2}px`,
      borderRadius: `${computedStyle.borderRadius}px`,
      ...exportOverrideStyle,
    };

    if (computedStyle.shadowBlur > 0) {
      dynamicStyle.textShadow = `${computedStyle.shadowOffsetX}px ${computedStyle.shadowOffsetY}px ${computedStyle.shadowBlur}px ${computedStyle.shadowColor}`;
    }
    if (computedStyle.strokeEnabled && computedStyle.strokeWidth > 0) {
      dynamicStyle.WebkitTextStroke = `${computedStyle.strokeWidth}px ${computedStyle.strokeColor}`;
    }

    // Highlight Mode
    if (isWordActive && mode !== 'none') {
      switch (mode) {
        case 'color':
          dynamicStyle.color = subtitleStyle.activeWordColor || '#facc15';
          if (computedStyle.gradient) {
            dynamicStyle.backgroundImage = 'none';
            dynamicStyle.WebkitTextFillColor = subtitleStyle.activeWordColor || '#facc15';
          }
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
          if (computedStyle.gradient) {
            dynamicStyle.backgroundImage = 'none';
            dynamicStyle.WebkitTextFillColor = '#000000';
          }
          dynamicStyle.opacity = 1.0;
          break;
        case 'karaoke':
          dynamicStyle.color = subtitleStyle.activeWordColor || '#facc15';
          if (computedStyle.gradient) {
            dynamicStyle.backgroundImage = 'none';
            dynamicStyle.WebkitTextFillColor = subtitleStyle.activeWordColor || '#facc15';
          }
          dynamicStyle.transform = 'scale(1.1)';
          dynamicStyle.textShadow = `0 0 12px ${subtitleStyle.activeWordColor || '#facc15'}CC`;
          dynamicStyle.opacity = 1.0;
          break;
      }
    }

    return (
      <span key={wordObj.id} style={dynamicStyle}>
        {wordObj.word.trim()}
      </span>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Load Fonts */}
      <link rel="stylesheet" href={fontUrl} />
      <link rel="stylesheet" href={teluguFontUrl} />

      {/* Video element */}
      <Video
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Caption Overlay */}
      {activeSegment && (
        <div
          style={{
            position: 'absolute',
            top: `${50 + subtitleStyle.positionY}%`,
            left: `${50 + subtitleStyle.positionX}%`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 50,
            width: '85%',
          }}
        >
          <span
            style={{
              fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", sans-serif`,
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
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'inline-block',
              maxWidth: '100%',
              whiteSpace: 'pre-wrap',
            }}
          >
            {activeSegmentWords.length > 0 ? (
              activeSegmentWords.map((wordObj) => renderWord(wordObj, activeSegment.id))
            ) : (
              activeSegment.text
            )}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
