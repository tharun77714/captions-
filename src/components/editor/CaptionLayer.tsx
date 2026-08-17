import React from 'react';
import type { Word, Segment } from '@/store/editor-store';
import type { CaptionBlock } from '@/lib/caption-composition';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import { resolveWordStyle, getInterWordGap } from '@/lib/subtitle-schema-v3';
import { computeDurationMs, getCSSTransitionParams } from '@/lib/transition-engine';
import { measurementService } from '@/lib/measurement-service';
import type { SemanticTag } from '@/lib/semantic-engine';

interface CaptionLayerProps {
  currentTime: number;
  subtitleStyle: SubtitleStyleV3;
  activeBlock: CaptionBlock | undefined;
  activeSegment: Segment | undefined;
  useCompositionRenderer: boolean;
  isExportMode: boolean; // Disable CSS transition and use frame-based time interpolation
  isLineMounted: boolean; // Driven by preview mounted state or export frame timing
  semanticTags?: Record<string, SemanticTag>;
}

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  currentTime,
  subtitleStyle,
  activeBlock,
  activeSegment,
  useCompositionRenderer,
  isExportMode,
  isLineMounted,
  semanticTags,
}) => {
  const activeSegmentWords = activeSegment ? activeSegment.words : [];

  const naturalSpaceWidth = measurementService.measureWidth({
    text: ' ',
    fontFamily: subtitleStyle.font.family,
    fontSize: subtitleStyle.fontSize,
    fontWeight: subtitleStyle.font.weight,
    letterSpacing: subtitleStyle.letterSpacing,
  });
  const gap = getInterWordGap(naturalSpaceWidth, subtitleStyle.wordSpacing);

  const renderWordHelper = (wordObj: Word, parentId: string | number) => {
    const isWordActive = currentTime >= wordObj.start && currentTime <= wordObj.end;

    const hasStarted = subtitleStyle.transition.target === 'line'
      ? isLineMounted
      : (isLineMounted && currentTime >= wordObj.start);

    const semanticTag = semanticTags ? semanticTags[wordObj.id] : undefined;
    const computedStyle = resolveWordStyle(subtitleStyle, parentId as number, wordObj.id, semanticTag);

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
      const tStyle: React.CSSProperties = {};

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
      // Only apply background to individual words if there's an explicit word/segment override or highlight mode
      backgroundColor: (computedStyle.hasWordOverride && computedStyle.backgroundEnabled) ? computedStyle.backgroundColor : 'transparent',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      verticalAlign: 'bottom',
      transition: isExportMode ? 'none' : `all ${transitionParams.durationMs}ms ${transitionParams.easing}`,
      padding: (computedStyle.hasWordOverride && computedStyle.backgroundEnabled)
        ? `${computedStyle.paddingY ?? 0}px ${computedStyle.paddingX ?? 0}px`
        : (subtitleStyle.highlightMode === 'background' ? '2px 8px' : '0px'),
      borderRadius: `${computedStyle.borderRadius}px`,
      ...(isExportMode ? exportOverrideStyle : transitionState),
    };

    if (computedStyle.shadowBlur > 0) {
      dynamicStyle.textShadow = `${computedStyle.shadowOffsetX}px ${computedStyle.shadowOffsetY}px ${computedStyle.shadowBlur}px ${computedStyle.shadowColor}`;
    }
    if (computedStyle.strokeEnabled && computedStyle.strokeWidth > 0) {
      dynamicStyle.WebkitTextStroke = `${computedStyle.strokeWidth}px ${computedStyle.strokeColor}`;
      dynamicStyle.paintOrder = 'stroke fill';
      (dynamicStyle as Record<string, string>).WebkitPaintOrder = 'stroke fill';
    }

    // Highlight Modes
    if (isWordActive) {
      switch (subtitleStyle.highlightMode) {
        case 'none':
          dynamicStyle.opacity = 1.0;
          break;
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
          dynamicStyle.borderRadius = '8px';
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
          dynamicStyle.transform = 'scale(1.18) translateY(-2px)';
          dynamicStyle.textShadow = `0 0 16px ${subtitleStyle.activeWordColor || '#facc15'}, 0 0 32px ${subtitleStyle.activeWordColor || '#facc15'}80`;
          dynamicStyle.opacity = 1.0;
          break;
      }
    }

    const { color, backgroundImage, WebkitBackgroundClip, WebkitTextFillColor, ...containerStyle } = dynamicStyle;

    return (
      <span key={wordObj.id} style={containerStyle}>
        <span
          style={{
            color,
            backgroundImage,
            WebkitBackgroundClip,
            WebkitTextFillColor,
          }}
        >
          {wordObj.word.trim()}
        </span>
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
              columnGap: `${gap}px`,
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
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: `${gap}px`,
          justifyContent: subtitleStyle.alignment === 'left' ? 'flex-start' : subtitleStyle.alignment === 'right' ? 'flex-end' : 'center'
        }}>
          {activeSegmentWords.map((wordObj) => renderWordHelper(wordObj, activeSegment!.id))}
        </div>
      ) : (
        <span style={{ fontFamily: `"${subtitleStyle.font.family}", "Noto Sans Telugu", sans-serif` }}>
          {activeSegment?.text}
        </span>
      )}
    </>
  );
};
