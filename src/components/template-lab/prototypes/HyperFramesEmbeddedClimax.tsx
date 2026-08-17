'use client';

/**
 * HYPERFRAMES EMBEDDED CLIMAX (Style B)
 * Hero punchline text positioned behind the creator with a lower caption rail.
 */

import React from 'react';
import type { TemplateRenderProps } from '@/lib/template-lab/types';
import { scaleCanvasUnit } from '@/lib/template-lab/metrics';

export default function HyperFramesEmbeddedClimax({
  grouped,
  canvas,
  aspectRatio,
  language,
  position
}: TemplateRenderProps) {
  const { width, height } = canvas;
  
  const s = (px: number) => {
    if (aspectRatio === '16:9') return scaleCanvasUnit(px * 0.7, width);
    if (aspectRatio === '1:1') return scaleCanvasUnit(px * 0.82, width);
    return scaleCanvasUnit(px, width);
  };

  const isIndic = language === 'telugu' || language === 'mixed';
  const heroFont = isIndic ? `'Noto Serif Telugu', serif` : `'Inter', serif`;
  const railFont = isIndic ? `'Noto Sans Telugu', sans-serif` : `'Inter', sans-serif`;

  const activeWord = grouped.activeWord || grouped.previousWords[grouped.previousWords.length - 1];
  const isHeroWord = activeWord?.text === 'మార్చేస్తుంది' || activeWord?.text === 'life-changing' || activeWord?.text === 'possibility';

  // Dynamic step-down sizing so long Telugu phrases never overflow
  let heroSize = s(isIndic ? 96 : 110);
  if (activeWord && activeWord.text.length > 10) {
    heroSize = Math.max(s(54), Math.floor(heroSize * 0.72));
  }

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
        pointerEvents: 'none',
      }}
    >
      {/* Layer 2: Hero Climax Word (Behind Person) */}
      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '6%',
          width: '88%',
          height: '36%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: heroFont,
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: heroSize,
            fontWeight: 900,
            color: '#FACC15', // Gold Hero Color
            textShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 60px rgba(250,204,21,0.4)',
            lineHeight: 1.15,
            wordBreak: 'keep-all',
            letterSpacing: isIndic ? 0 : '-0.02em',
            transform: 'scale(1.02)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {activeWord ? activeWord.text : 'మార్చేస్తుంది'}
        </span>
        <span style={{ fontSize: s(14), color: 'rgba(255,255,255,0.6)', marginTop: s(8), textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          ✦ HyperFrames Depth Layer ✦
        </span>
      </div>

      {/* Layer 5: Lower Third Rail */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '6%',
          width: '88%',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${s(8)}px ${s(14)}px`,
          padding: `${s(12)}px ${s(20)}px`,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(16px)',
          borderRadius: s(16),
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontFamily: railFont,
          zIndex: 10,
        }}
      >
        {allWords.map((w, idx) => {
          const isActive = w.state === 'active';
          return (
            <span
              key={idx}
              style={{
                fontSize: s(isIndic ? 36 : 40),
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                textShadow: isActive ? '0 0 16px rgba(255, 255, 255, 0.8)' : 'none',
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
