'use client';

/**
 * HYPERFRAMES CREATOR RAIL (Style A)
 * Clean lower-third kinetic word rail with glassmorphism backing.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function HyperFramesCreatorRail({
  grouped,
  canvas,
  aspectRatio,
  language,
  position
}: TemplateRenderProps) {
  const { width, height } = canvas;
  
  const s = (px: number) => {
    if (aspectRatio === '16:9') return scaleCanvasUnit(px * 0.75, width);
    if (aspectRatio === '1:1') return scaleCanvasUnit(px * 0.85, width);
    return scaleCanvasUnit(px, width);
  };

  const isIndic = language === 'telugu' || language === 'mixed';
  const fontFamily = isIndic ? `'Noto Sans Telugu', 'Inter', sans-serif` : `'Inter', sans-serif`;

  let anchorY = height * 0.78;
  if (position === 'upper') anchorY = height * 0.22;
  else if (position === 'centre') anchorY = height * 0.50;

  const allWords = [
    ...grouped.previousWords.map(w => ({ ...w, state: 'prev' as const })),
    ...(grouped.activeWord ? [{ ...grouped.activeWord, state: 'active' as const }] : []),
    ...grouped.upcomingWords.map(w => ({ ...w, state: 'next' as const })),
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        fontFamily,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: anchorY,
          width: '88%',
          maxWidth: width * 0.88,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${s(10)}px ${s(16)}px`,
          padding: `${s(14)}px ${s(24)}px`,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(12px)',
          borderRadius: s(20),
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        {allWords.map((w, idx) => {
          const isActive = w.state === 'active';
          return (
            <span
              key={idx}
              style={{
                fontSize: s(isIndic ? 40 : 44),
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                textShadow: isActive ? '0 0 20px rgba(255, 255, 255, 0.8)' : 'none',
                transform: isActive ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.15s ease-out',
                lineHeight: 1.3,
                wordBreak: 'keep-all',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
