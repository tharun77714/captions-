import React from 'react';
import type { Word, Segment } from '@/store/editor-store';
import type { CaptionBlock } from '@/lib/caption-composition';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import { resolveWordStyle } from '@/lib/subtitle-schema-v3';
import { computeDurationMs, getCSSTransitionParams } from '@/lib/transition-engine';

interface CaptionLayerProps {
  currentTime: number;
  subtitleStyle: SubtitleStyleV3;
  activeBlock: CaptionBlock | undefined;
  activeSegment: Segment | undefined;
  useCompositionRenderer: boolean;
  isExportMode: boolean; // Disable CSS transition and use frame-based time interpolation
}

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  currentTime,
  subtitleStyle,
  activeBlock,
  activeSegment,
  useCompositionRenderer,
  isExportMode,
}) => {
  const activeSegmentWords = activeSegment ? activeSegment.words : [];

  const renderWordHelper = (wordObj: Word, parentId: string | number) => {
    const isWordActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
    
    // In preview mode, line is considered mounted if the block/segment is currently active.
    const isLineMounted = useCompositionRenderer
      ? (activeBlock ? (currentTime >= activeBlock.start && currentTime <= activeBlock.end) : false)
      : (activeSegment ? (currentTime >= activeSegment.start && currentTime <= activeSegment.end) : false);

    const hasStarted = subtitleStyle.transition.target === 'line'
      ? isLineMounted
      : (isLineMounted && currentTime >= wordObj.start);

    const mode = subtitleStyle.highlightMode || 'none';
    const computedStyle = resolveWordStyle(subtitleStyle, parentId as number, wordObj.id);

    // Transition timing parameters
    const durationMs = computeDurationMs(subtitleStyle.transition, wordObj.start, wordObj.end);
    const transitionParams = getCSSTransitionParams(subtitleStyle.transition.type, durationMs);

    // Initial vs active transitions for CSS rendering
    const transitionState = hasStarted ? transitionParams.activeStyle : transitionParams.initialStyle;

    let exportOverrideStyle: React.CSSProperties = {};

    if (isExportMode && subtitleStyle.transition.type !== 'none') {
      const parentStart = useCompositionRenderer ? (activeBlock?.start ?? wordObj.start) : (activeSegment?.start ?? wordObj.start);
      const animStart = subtitleStyle.transition.target === 'line' ? parentStart : wordObj.start;
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

    // Combine into final style object
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
      transition: isExportMode ? 'none' : `all ${transitionParams.durationMs}ms ${transitionParams.easing}`,
      padding: `${computedStyle.paddingY ?? 0}px ${computedStyle.paddingX ?? 2}px`,
      borderRadius: `${computedStyle.borderRadius}px`,
      ...(isExportMode ? exportOverrideStyle : transitionState),
    };

    if (computedStyle.shadowBlur > 0) {
      dynamicStyle.textShadow = `${computedStyle.shadowOffsetX}px ${computedStyle.shadowOffsetY}px ${computedStyle.shadowBlur}px ${computedStyle.shadowColor}`;
    }
    if (computedStyle.strokeEnabled && computedStyle.strokeWidth > 0) {
      dynamicStyle.WebkitTextStroke = `${computedStyle.strokeWidth}px ${computedStyle.strokeColor}`;
    }

    // Highlight Modes
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

  if (useCompositionRenderer && activeBlock) {
    return (
      <>
        {activeBlock.lines.map((line, lIdx) => (
          <div
            key={lIdx}
            className="composition-line"
            style={{
              display: 'flex',
              justifyContent: subtitleStyle.alignment === 'left' ? 'flex-start' : subtitleStyle.alignment === 'right' ? 'flex-end' : 'center',
            }}
          >
            {line.words.map((wordObj) => renderWordHelper(wordObj, activeBlock.id))}
          </div>
        ))}
      </>
    );
  }

  // Fallback to activeSegment level mapping if not using computed blocks
  return (
    <>
      {activeSegmentWords.length > 0 ? (
        activeSegmentWords.map((wordObj) => renderWordHelper(wordObj, activeSegment!.id))
      ) : (
        <span style={{ fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", sans-serif` }}>
          {activeSegment?.text}
        </span>
      )}
    </>
  );
};
