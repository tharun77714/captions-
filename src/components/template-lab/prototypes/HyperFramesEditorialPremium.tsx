'use client';

/**
 * HYPERFRAMES EDITORIAL PREMIUM (Style C)
 * Minimal high-contrast typography with serif hero emphasis.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function HyperFramesEditorialPremium({
  grouped,
  canvas,
  aspectRatio,
  language,
  position
}: TemplateRenderProps) {
  const { width, height } = canvas;
  
  const s = (px: number) => {
    if (aspectRatio === '16:9') return scaleCanvasUnit(px * 0.72, width);
    if (aspectRatio === '1:1') return scaleCanvasUnit(px * 0.85, width);
    return scaleCanvasUnit(px, width);
  };

  const isIndic = language === 'telugu' || language === 'mixed';
  const fontFamily = isIndic ? `'Noto Serif Telugu', 'Inter', serif` : `'Inter', serif`;

  let anchorY = height * 0.76;
  if (position === 'upper') anchorY = height * 0.20;
  else if (position === 'centre') anchorY = height * 0.48;

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
          width: '90%',
          maxWidth: width * 0.90,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: `${s(8)}px ${s(18)}px`,
          padding: `${s(16)}px ${s(28)}px`,
          background: 'linear-gradient(180deg, rgba(15,15,18,0.7) 0%, rgba(5,5,8,0.85) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: s(12),
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        {allWords.map((w, idx) => {
          const isActive = w.state === 'active';
          return (
            <span
              key={idx}
              style={{
                fontSize: s(isActive ? (isIndic ? 48 : 52) : (isIndic ? 38 : 42)),
                fontWeight: isActive ? 800 : 400,
                color: isActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.55)', // Cyan Active Highlight
                textShadow: isActive ? '0 0 24px rgba(56, 189, 248, 0.6)' : 'none',
                fontStyle: isActive && !isIndic ? 'italic' : 'normal',
                lineHeight: 1.25,
                wordBreak: 'keep-all',
                transition: 'all 0.18s ease',
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
