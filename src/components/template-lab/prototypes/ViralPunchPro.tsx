'use client';

/**
 * VIRAL PUNCH PRO
 * High-energy 1-word scaling.
 * 
 * Recipes by Aspect Ratio:
 * - 9:16: Massive center text, heavy stroke, designed to pop over TikTok/Reels UI.
 * - 1:1: Slightly smaller, constrained vertically.
 * - 16:9: Smaller still, positioned lower-middle to avoid blocking face.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function ViralPunchPro({
  grouped,
  canvas,
  aspectRatio,
  language,
  position
}: TemplateRenderProps) {
  const { width, height } = canvas;
  
  // Aspect ratio recipe sizing
  const s = (px: number) => {
    if (aspectRatio === '16:9') return scaleCanvasUnit(px * 0.7, width);
    if (aspectRatio === '1:1') return scaleCanvasUnit(px * 0.85, width);
    return scaleCanvasUnit(px, width); // 9:16
  };

  const isIndic = language === 'telugu' || language === 'mixed';
  
  // Viral fonts are heavy. We use Inter 900 for English, Noto Sans Telugu 900 for Indic.
  const fontFamily = isIndic ? `'Noto Sans Telugu', sans-serif` : `'Inter', sans-serif`;
  const fontWeight = 900;
  
  const fontSize = s(isIndic ? 120 : 150);
  const strokeWidth = Math.max(3, s(isIndic ? 6 : 8));
  const dropShadow = `0px ${s(10)}px 0px rgba(0,0,0,0.8)`;

  // Vertical positioning recipe
  let anchorY = height / 2;
  if (position === 'lower' || aspectRatio === '16:9') {
    anchorY = height * 0.75;
  } else if (position === 'upper') {
    anchorY = height * 0.25;
  }

  // We only show the active word for Viral Punch
  const word = grouped.activeWord || grouped.previousWords[grouped.previousWords.length - 1] || grouped.upcomingWords[0];

  if (!word) return null;

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
          top: anchorY - fontSize / 2,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            lineHeight: isIndic ? 1.4 : 1.1, // Indic scripts need more vertical breathing room
            color: '#FACC15', // Vibrant yellow
            textTransform: isIndic ? 'none' : 'uppercase',
            WebkitTextStroke: `${strokeWidth}px black`,
            textShadow: dropShadow,
            letterSpacing: isIndic ? '0' : '-0.02em',
          }}
        >
          {word.text}
        </span>
      </div>
    </div>
  );
}
