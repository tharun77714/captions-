import React from 'react';
import type { CaptionBlock } from '@/lib/caption-composition';
import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import type { SemanticTag } from '@/lib/semantic-engine';
import { CaptionLayer } from './CaptionLayer';

interface CaptionOverlayProps {
  currentTime: number;
  subtitleStyle: SubtitleStyleV3;
  activeBlock: CaptionBlock | undefined;
  activeSegment: Segment | undefined;
  useCompositionRenderer: boolean;
  isExportMode: boolean;
  isLineMounted: boolean;
  /** Styles are authored on a 1080px-wide canvas and scaled for the viewport/output. */
  renderScale?: number;
  spanRef?: React.Ref<HTMLSpanElement>;
  children?: React.ReactNode;
  semanticTags?: Record<string, SemanticTag>;
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
      renderScale = 1,
      children,
      semanticTags,
    },
    ref
  ) => {
    const safeScale = Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 1;

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
            // Keep wrapping/layout in the canonical 1080px coordinate system,
            // then scale the finished caption box to the preview/output size.
            maxWidth: `${100 / safeScale}%`,
            transform: `scale(${safeScale})`,
            transformOrigin: 'center center',
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
            semanticTags={semanticTags}
          />
          {children}
        </span>
      </div>
    );
  }
);

CaptionOverlay.displayName = 'CaptionOverlay';
