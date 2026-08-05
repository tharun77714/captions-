import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { Video } from '@remotion/media';
import type { ExportInputProps } from './types';
import { CaptionOverlay } from '@/components/editor/CaptionOverlay';

export const CaptionComposition: React.FC<ExportInputProps> = ({
  videoUrl,
  segments,
  subtitleStyle,
  useCompositionRenderer = true,
  computedBlocks,
  watermark = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const currentTime = frame / fps;
  const renderScale = width / 1080;

  const fontName = subtitleStyle.font?.family || 'Inter';
  const cacheKey = `${fontName}_Noto-Sans-Telugu`;

  // Create one stable delay handle using a state initializer
  const [handle] = useState(() => delayRender('Fonts loading: ' + cacheKey));

  useEffect(() => {
    // Helper to dynamically inject link elements for CSS stylesheets
    const injectStylesheet = (href: string, timeoutMs = 8_000): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
          resolve();
          return;
        }
        const link = document.createElement('link');
        const timeout = window.setTimeout(() => {
          link.remove();
          reject(new Error(`Font stylesheet timed out: ${href}`));
        }, timeoutMs);
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        link.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error(`Failed to load stylesheet: ${href}`));
        };
        document.head.appendChild(link);
      });
    };

    const loadAllResources = async () => {
      console.log(`[CaptionComposition] Injecting Google Fonts stylesheets for Inter, Noto Sans Telugu, and ${fontName}`);
      
      // Load Google Fonts CSS stylesheets (displays block for rendering)
      const stylesheetResults = await Promise.allSettled([
        injectStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=block'),
        injectStylesheet('https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=block'),
        fontName !== 'Inter'
          ? injectStylesheet(`https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700;900&display=block`)
          : Promise.resolve(),
      ]);

      const fontFailures = stylesheetResults.filter((result) => result.status === 'rejected');
      if (fontFailures.length > 0) {
        console.warn(`[CaptionComposition] ${fontFailures.length} font stylesheet(s) failed; using loaded/fallback fonts.`);
      }

      console.log(`[CaptionComposition] Awaiting explicit document.fonts.load calls for deterministic rendering`);

      // Await explicitly using actual Telugu sample text characters
      await Promise.race([
        Promise.allSettled([
          document.fonts.load(`${subtitleStyle.font.weight} 24px "${fontName}"`),
          document.fonts.load(`400 24px "Noto Sans Telugu"`, 'తెలుగు'),
          document.fonts.load(`700 24px "Noto Sans Telugu"`, 'తెలుగు'),
        ]),
        new Promise<void>((resolve) => window.setTimeout(resolve, 8_000)),
      ]);
    };

    loadAllResources()
      .then(() => {
        console.log(`[CaptionComposition] Fonts loaded successfully. Starting composition render.`);
        continueRender(handle);
      })
      .catch((err) => {
        console.warn(`[CaptionComposition] Font preparation failed; continuing with browser fallback fonts.`, err);
        continueRender(handle);
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
            transform: 'translate(-50%, -50%)',
            width: '100%',
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
            renderScale={renderScale}
          />
        </div>
      )}

      {watermark && (
        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 24,
            zIndex: 100,
            padding: '7px 11px',
            borderRadius: 8,
            background: 'rgba(0, 0, 0, 0.62)',
            color: 'rgba(255,255,255,0.88)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Vidyut Captions
        </div>
      )}
    </AbsoluteFill>
  );
};
