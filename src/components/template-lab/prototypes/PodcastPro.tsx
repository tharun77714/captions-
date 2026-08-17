'use client';

/**
 * PODCAST PRO
 * Clean 3-word bursts.
 * 
 * Recipes by Aspect Ratio:
 * - 9:16: Stacked or tight wrap, lower third.
 * - 1:1: Wider wrap.
 * - 16:9: Single line lower third.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function PodcastPro({
  grouped,
  canvas,
  aspectRatio,
  language,
  position
}: TemplateRenderProps) {
  const { width, height } = canvas;
  
  const s = (px: number) => {
    if (aspectRatio === '16:9') return scaleCanvasUnit(px * 0.6, width);
    if (aspectRatio === '1:1') return scaleCanvasUnit(px * 0.75, width);
    return scaleCanvasUnit(px, width); // 9:16
  };

  const isIndic = language === 'telugu' || language === 'mixed';
  const fontFamily = isIndic ? `'Noto Sans Telugu', sans-serif` : `'Inter', sans-serif`;
  const fontWeight = 700;
  
  const fontSize = s(isIndic ? 64 : 72);
  const containerWidth = aspectRatio === '9:16' ? width * 0.8 : width * 0.6;

  let anchorY = height * 0.65;
  if (position === 'lower') anchorY = height * 0.75;
  else if (position === 'upper') anchorY = height * 0.25;

  const renderWord = (w: typeof grouped.activeWord, isActive: boolean) => {
    if (!w) return null;
    return (
      <span
        key={w.id}
        style={{
          display: 'inline-block',
          color: isActive ? '#38BDF8' : '#F8FAFC',
          textShadow: `0px ${s(4)}px ${s(12)}px rgba(0,0,0,0.6), 0px ${s(2)}px ${s(4)}px rgba(0,0,0,0.8)`,
          marginRight: s(16),
          marginBottom: s(12),
        }}
      >
        {w.text}
      </span>
    );
  };

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
          width: containerWidth,
          textAlign: 'center',
          fontSize,
          fontWeight,
          lineHeight: isIndic ? 1.5 : 1.2,
          letterSpacing: isIndic ? '0' : '-0.01em',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {grouped.previousWords.map(w => renderWord(w, false))}
        {grouped.activeWord && renderWord(grouped.activeWord, true)}
        {grouped.upcomingWords.map(w => renderWord(w, false))}
      </div>
    </div>
  );
}
