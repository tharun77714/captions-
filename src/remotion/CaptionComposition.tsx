import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';
import { Video } from '@remotion/media';
import type { ExportInputProps } from './types';
import { CaptionOverlay } from '@/components/editor/CaptionOverlay';

export const CaptionComposition: React.FC<ExportInputProps> = ({
  videoUrl,
  segments,
  subtitleStyle,
  subtitleMode,
  useCompositionRenderer,
  computedBlocks,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const fontName = subtitleStyle.font?.family || 'Inter';
  const cacheKey = `${fontName}_Noto-Sans-Telugu`;

  // Create one stable delay handle using a state initializer
  const [handle] = useState(() => delayRender('Fonts loading: ' + cacheKey));

  useEffect(() => {
    // Helper to dynamically inject link elements for CSS stylesheets
    const injectStylesheet = (href: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
          resolve();
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        document.head.appendChild(link);
      });
    };

    const loadAllResources = async () => {
      console.log(`[CaptionComposition] Injecting Google Fonts stylesheets for Inter, Noto Sans Telugu, and ${fontName}`);
      
      // Load Google Fonts CSS stylesheets (displays block for rendering)
      await Promise.all([
        injectStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=block'),
        injectStylesheet('https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=block'),
        fontName !== 'Inter'
          ? injectStylesheet(`https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700;900&display=block`)
          : Promise.resolve(),
      ]);

      console.log(`[CaptionComposition] Awaiting explicit document.fonts.load calls for deterministic rendering`);

      // Await explicitly using actual Telugu sample text characters
      await Promise.all([
        document.fonts.load(`${subtitleStyle.font.weight} 24px "${fontName}"`),
        document.fonts.load(`400 24px "Noto Sans Telugu"`, 'తెలుగు'),
        document.fonts.load(`700 24px "Noto Sans Telugu"`, 'తెలుగు'),
      ]);
    };

    loadAllResources()
      .then(() => {
        console.log(`[CaptionComposition] Fonts loaded successfully. Starting composition render.`);
        continueRender(handle);
      })
      .catch((err) => {
        const errorMsg = `CRITICAL FONT ERROR: ${err.message || err}`;
        console.error(errorMsg);
        // Call cancelRender so the renderer terminates visibly instead of hanging
        cancelRender(err);
      });
  }, [fontName, subtitleStyle.font.weight, handle, cacheKey]);

  // Find active segment
  const activeSegment = segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  const activeBlock = computedBlocks?.find(
    (b) => currentTime >= b.start && currentTime <= b.end
  );

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Video layer */}
      <Video
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Caption Overlay */}
      {(useCompositionRenderer ? activeBlock : activeSegment) && (
        <div
          style={{
            position: 'absolute',
            top: `${50 + subtitleStyle.positionY}%`,
            left: `${50 + subtitleStyle.positionX}%`,
            zIndex: 50,
          }}
        >
          <CaptionOverlay
            currentTime={currentTime}
            subtitleStyle={subtitleStyle}
            activeBlock={activeBlock}
            activeSegment={activeSegment}
            useCompositionRenderer={useCompositionRenderer}
            isExportMode={true}
            isLineMounted={true}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};
