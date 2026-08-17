'use client';

/**
 * TEMPLATE STAGE — Full-size static preview canvas
 *
 * Renders the selected static template at native canvas dimensions,
 * scaled to fit the available space via CSS transform.
 *
 * Development-only.
 */

import React, { useRef, useEffect, useState } from 'react';
import type { TemplateDefinition, AspectRatio, LabLanguage, CanvasSize, StoryboardState, GroupedWords } from '@/lib/template-lab/types';
import { getSafeBounds, PositionAnchor } from '@/lib/template-lab/metrics';

const CANVAS_SIZES: Record<AspectRatio, CanvasSize> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1':  { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

export type FaceSafePreset = 'left' | 'centre' | 'right' | 'product-bottom' | 'clear';

interface TemplateStageProps {
  template: TemplateDefinition;
  grouped: GroupedWords;
  aspectRatio: AspectRatio;
  language: LabLanguage;
  backgroundType: string;
  videoUrl: string | null;
  showSafeArea: boolean;
  faceSafePreset: FaceSafePreset;
  position: PositionAnchor;
  storyboardState: StoryboardState;
  secondaryGrouped?: GroupedWords;
  secondaryLanguage?: LabLanguage;
}

export default function TemplateStage({
  template,
  grouped,
  aspectRatio,
  language,
  backgroundType,
  videoUrl,
  showSafeArea,
  faceSafePreset,
  position,
  storyboardState,
  secondaryGrouped,
  secondaryLanguage,
}: TemplateStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const canvas = CANVAS_SIZES[aspectRatio];

  // Font readiness is now handled exclusively by FontLoader wrapping the Lab
  const fontsReady = true;
  const fontsFailed = false;

  // Compute CSS scale to fit the container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = clientWidth / canvas.width;
      const scaleY = clientHeight / canvas.height;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvas.width, canvas.height]);

  const { Component } = template;

  const backgroundStyle = (() => {
    switch (backgroundType) {
      case 'light': return { background: '#f8f9fa' };
      case 'colorful': return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f64f59 100%)' };
      case 'video': return { background: '#000' };
      default: return { background: '#111112' };
    }
  })();

  const safeBounds = getSafeBounds(canvas.width, canvas.height, aspectRatio);

  const renderFaceSafeZone = () => {
    if (faceSafePreset === 'clear') return null;
    
    // Coordinates based on standard 9:16 face zones
    let left = 0, top = 0, width = 0, height = 0;
    
    const cw = canvas.width;
    const ch = canvas.height;

    switch (faceSafePreset) {
      case 'centre':
        left = cw * 0.2; width = cw * 0.6;
        top = ch * 0.2; height = ch * 0.4;
        break;
      case 'left':
        left = cw * 0.1; width = cw * 0.4;
        top = ch * 0.2; height = ch * 0.4;
        break;
      case 'right':
        left = cw * 0.5; width = cw * 0.4;
        top = ch * 0.2; height = ch * 0.4;
        break;
      case 'product-bottom':
        left = cw * 0.2; width = cw * 0.6;
        top = ch * 0.6; height = ch * 0.3;
        break;
    }

    return (
      <div style={{
        position: 'absolute',
        left, top, width, height,
        background: 'rgba(239, 68, 68, 0.2)', // translucent red
        border: '2px dashed rgba(239, 68, 68, 0.5)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(239, 68, 68, 0.8)',
        fontSize: Math.max(24, cw * 0.04),
        fontWeight: 'bold',
        textTransform: 'uppercase',
      }}>
        Obstacle
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0b',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {(!fontsReady && !fontsFailed) && (
        <div style={{ position: 'absolute', top: 10, left: 10, color: '#fff', fontSize: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 4, zIndex: 10 }}>
          Loading Fonts...
        </div>
      )}
      {fontsFailed && (
        <div style={{ position: 'absolute', top: 10, left: 10, color: '#f87171', fontSize: 12, background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: 4, zIndex: 10 }}>
          Font Load Failed
        </div>
      )}

      {/* Scaled canvas wrapper */}
      <div
        style={{
          width: canvas.width,
          height: canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'absolute',
          left: '50%',
          top: '50%',
          marginLeft: -canvas.width / 2,
          marginTop: -canvas.height / 2,
          flexShrink: 0,
          borderRadius: 8,
          overflow: 'hidden',
          ...backgroundStyle,
        }}
      >
        {/* Background video if provided */}
        {backgroundType === 'video' && videoUrl && (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: 0.85,
            }}
          />
        )}

        {/* Template renderer */}
        {fontsReady && (
          <Component
            grouped={grouped}
            canvas={canvas}
            aspectRatio={aspectRatio}
            language={language}
            storyboardState={storyboardState}
            position={position}
            secondaryGrouped={secondaryGrouped}
            secondaryLanguage={secondaryLanguage}
          />
        )}

        {/* Safe area guide overlay strictly from metrics */}
        {showSafeArea && (
          <div
            style={{
              position: 'absolute',
              left: safeBounds.left,
              top: safeBounds.top,
              width: safeBounds.width,
              height: safeBounds.height,
              pointerEvents: 'none',
              border: `${Math.max(2, canvas.width * 0.002)}px dashed rgba(255,255,255,0.4)`,
              borderRadius: 4,
            }}
          >
            <div style={{ position: 'absolute', top: 4, left: 4, color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>SAFE ZONE</div>
          </div>
        )}

        {/* Face safe zone obstacle */}
        {renderFaceSafeZone()}
      </div>
    </div>
  );
}

export { CANVAS_SIZES };
