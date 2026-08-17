'use client';

/**
 * BILINGUAL INDIA PRO
 * Telugu + Romanized English.
 * 
 * Recipes by Aspect Ratio:
 * - 9:16: Stacked block, primary above, secondary below.
 * - 1:1: Same but slightly smaller.
 * - 16:9: Same layout, lower third.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function BilingualIndiaPro({
  grouped,
  secondaryGrouped,
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
  
  const priFontSize = s(isIndic ? 72 : 80);
  const secFontSize = s(isIndic ? 36 : 40);

  const containerWidth = aspectRatio === '9:16' ? width * 0.8 : width * 0.6;

  let anchorY = height * 0.65;
  if (position === 'lower') anchorY = height * 0.75;
  else if (position === 'upper') anchorY = height * 0.25;

  const renderPriWord = (w: typeof grouped.activeWord, isActive: boolean) => {
    if (!w) return null;
    return (
      <span
        key={w.id}
        style={{
          display: 'inline-block',
          color: isActive ? '#F97316' : '#FFFFFF',
          textShadow: `0px ${s(4)}px ${s(12)}px rgba(0,0,0,0.8)`,
          marginRight: s(16),
          marginBottom: s(12),
        }}
      >
        {w.text}
      </span>
    );
  };

  const renderSecWord = (w: typeof grouped.activeWord, isActive: boolean) => {
    if (!w) return null;
    return (
      <span
        key={w.id}
        style={{
          display: 'inline-block',
          color: isActive ? '#3B82F6' : 'rgba(255,255,255,0.7)',
          textShadow: `0px ${s(2)}px ${s(6)}px rgba(0,0,0,0.8)`,
          marginRight: s(10),
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
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: anchorY,
          width: containerWidth,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: s(16),
        }}
      >
        {/* Primary Lane */}
        <div style={{
          fontSize: priFontSize,
          fontWeight: 900,
          fontFamily: isIndic ? `'Noto Sans Telugu', sans-serif` : `'Inter', sans-serif`,
          lineHeight: isIndic ? 1.4 : 1.1,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {grouped.previousWords.map(w => renderPriWord(w, false))}
          {grouped.activeWord && renderPriWord(grouped.activeWord, true)}
          {grouped.upcomingWords.map(w => renderPriWord(w, false))}
        </div>

        {/* Secondary Lane (if exists) */}
        {secondaryGrouped && (
          <div style={{
            fontSize: secFontSize,
            fontWeight: 600,
            fontFamily: `'Inter', sans-serif`,
            lineHeight: 1.2,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {secondaryGrouped.previousWords.map(w => renderSecWord(w, false))}
            {secondaryGrouped.activeWord && renderSecWord(secondaryGrouped.activeWord, true)}
            {secondaryGrouped.upcomingWords.map(w => renderSecWord(w, false))}
          </div>
        )}
      </div>
    </div>
  );
}
