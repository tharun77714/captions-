import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { CaptionComposition } from './CaptionComposition';
import type { ExportInputProps } from './types';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaptionComposition"
        component={CaptionComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          projectId: '',
          videoUrl: '',
          fps: 30,
          durationInFrames: 300,
          dimensions: { width: 1080, height: 1920 },
          segments: [],
          subtitleStyle: {
            _version: 3,
            font: { family: 'Inter', weight: 700, italic: false, underline: false, textTransform: 'none' },
            fontSize: 24,
            letterSpacing: 0,
            wordSpacing: 0,
            lineSpacing: 1.2,
            textColor: { mode: 'solid', solid: '#FFFFFF' },
            stroke: { enabled: false, color: '#000000', width: 0 },
            shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 0, offsetY: 0 },
            background: { enabled: false, color: 'rgba(0,0,0,0.75)', opacity: 1, paddingX: 0, paddingY: 0, borderRadius: 0 },
            blur: 0,
            alignment: 'center',
            positionX: 0,
            positionY: 0,
            highlightMode: 'none',
            activeWordColor: '#FFFFFF',
            inactiveOpacity: 0.5,
            transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
            overrides: { wordStyles: {}, segmentStyles: {} }
          },
          subtitleMode: 'original'
        } as ExportInputProps}
      />
    </>
  );
};

// Make sure to register the root for CLI renders
try {
  registerRoot(RemotionRoot);
} catch (e) {
  // registerRoot might throw if run in non-browser context during build, so we catch
}
