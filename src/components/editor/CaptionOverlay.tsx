import React from 'react';
import type { CaptionBlock } from '@/lib/caption-composition';
import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import { CaptionLayer } from './CaptionLayer';

interface CaptionOverlayProps {
  currentTime: number;
  subtitleStyle: SubtitleStyleV3;
  activeBlock: CaptionBlock | undefined;
  activeSegment: Segment | undefined;
  useCompositionRenderer: boolean;
  isExportMode: boolean;
  isLineMounted: boolean;
  spanRef?: React.Ref<HTMLSpanElement>;
  children?: React.ReactNode;
}

export const CaptionOverlay = React.forwardRef<HTMLSpanElement, CaptionOverlayProps>(
  (
    {
      currentTime,
      subtitleStyle,
      activeBlock,
      activeSegment,
      useCompositionRenderer,
      isExportMode,
      isLineMounted,
      children,
    },
    ref
  ) => {
    return (
      <div
        style={{
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '85%',
          pointerEvents: 'none',
        }}
      >
        <span
          ref={ref}
          className="group relative px-3 py-1.5 rounded-md max-w-full whitespace-pre-wrap pointer-events-auto cursor-move hover:ring-2 hover:ring-violet-500/50 transition-shadow"
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
          }}
        >
          <CaptionLayer
            currentTime={currentTime}
            subtitleStyle={subtitleStyle}
            activeBlock={activeBlock}
            activeSegment={activeSegment}
            useCompositionRenderer={useCompositionRenderer}
            isExportMode={isExportMode}
            isLineMounted={isLineMounted}
          />
          {children}
        </span>
      </div>
    );
  }
);

CaptionOverlay.displayName = 'CaptionOverlay';
