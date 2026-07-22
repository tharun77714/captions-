import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import type { ExportInputProps } from './types';
import { CaptionOverlay } from '@/components/editor/CaptionOverlay';

// Use a module level map to cache loaded fonts so we don't reload them on every frame re-render
const loadedFonts = new Set<string>();

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

  const [fontsLoaded, setFontsLoaded] = useState(() => loadedFonts.has(cacheKey));
  const [handle, setHandle] = useState<number | null>(null);

  // Synchronously request Remotion to delay render on mount if fonts are not loaded
  if (!fontsLoaded && !handle) {
    const renderHandle = delayRender('Fonts loading: ' + cacheKey);
    setHandle(renderHandle);
  }

  useEffect(() => {
    if (fontsLoaded) return;

    console.log(`[CaptionComposition] Starting font loading for: ${fontName} and Noto Sans Telugu`);

    // Helper to dynamically inject FontFace to document
    const loadFont = async (name: string, url: string) => {
      try {
        const fontFace = new FontFace(name, `url(${url})`);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);
        console.log(`[CaptionComposition] Successfully registered font: ${name}`);
      } catch (e) {
        console.error(`[CaptionComposition] Failed to load font face ${name}:`, e);
        throw new Error(`Font loading failed: ${name}`);
      }
    };

    // Load actual woff2 links (no swap, direct binary download, fail fast)
    Promise.all([
      // Canonical Inter Font
      loadFont(
        'Inter',
        'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyMZhrib2D1A.woff2'
      ),
      // Canonical Noto Sans Telugu
      loadFont(
        'Noto Sans Telugu',
        'https://fonts.gstatic.com/s/notosanstelugu/v25/1PX2W8S4nC22Kq2xVWe1Z1U_K2Y.woff2'
      ),
      // Active editor chosen font (if different from Inter)
      fontName !== 'Inter'
        ? loadFont(
            fontName,
            `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@700&display=block`
          )
        : Promise.resolve(),
    ])
      .then(() => {
        loadedFonts.add(cacheKey);
        setFontsLoaded(true);
        if (handle !== null) {
          continueRender(handle);
        }
      })
      .catch((err) => {
        // Halt render visibly so the video export fails instantly rather than outputting generic text
        const errorMsg = `CRITICAL FONT ERROR: ${err.message || err}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      });
  }, [fontName, handle, fontsLoaded, cacheKey]);

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
