'use client';

/**
 * TEMPLATE GALLERY — Six preview cards (STATIC)
 *
 * Displays the template using the 'active' storyboard state.
 *
 * Development-only.
 */

import React, { useState } from 'react';
import type { TemplateDefinition, LabLanguage } from '@/lib/template-lab/types';
import { getFixtureSegment } from '@/lib/template-lab/fixtures';
import { getGroupedWords, getSecondaryGroupedWords } from '@/lib/template-lab/grouping';
import { CANVAS_SIZES } from './TemplateStage';

interface TemplateGalleryProps {
  templates: TemplateDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
  language: LabLanguage;
}

function GalleryCard({
  template,
  isSelected,
  language,
  onSelect,
}: {
  template: TemplateDefinition;
  isSelected: boolean;
  language: LabLanguage;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Gallery cards always render the 'active' state in 9:16
  const aspectRatio = '9:16';
  const storyboardState = 'active';
  const segment = getFixtureSegment(language, storyboardState);
  
  const grouped = getGroupedWords(segment.words, storyboardState);
  const secondaryGrouped = segment.secondaryWords 
    ? getSecondaryGroupedWords(grouped, segment.secondaryWords, storyboardState) 
    : undefined;

  const canvas = CANVAS_SIZES[aspectRatio];
  const CARD_W = 280;
  const CARD_H = 420;
  const scale = CARD_W / canvas.width;
  const { Component } = template;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Preview */}
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          outline: isSelected
            ? '2.5px solid rgba(139,92,246,0.85)'
            : isHovered
            ? '1.5px solid rgba(255,255,255,0.2)'
            : '1.5px solid rgba(255,255,255,0.07)',
          boxShadow: isSelected
            ? '0 0 0 4px rgba(139,92,246,0.2)'
            : 'none',
          transition: 'outline 0.15s, box-shadow 0.15s',
          background: '#111',
        }}
      >
        {/* Scaled template */}
        <div
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <Component
            grouped={grouped}
            canvas={canvas}
            aspectRatio={aspectRatio}
            language={segment.language}
            storyboardState={storyboardState}
            position="centre"
            secondaryGrouped={secondaryGrouped}
            secondaryLanguage={segment.secondaryLanguage}
          />
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(139,92,246,0.9)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '3px 7px',
              borderRadius: 4,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ACTIVE
          </div>
        )}
      </div>

      {/* Card label */}
      <div style={{ paddingLeft: 2 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isSelected ? '#e2d9f3' : '#d4d0d8',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.3,
          }}
        >
          {template.meta.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(212,208,216,0.5)',
            fontFamily: 'system-ui, sans-serif',
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {template.meta.tagline}
        </div>
      </div>
    </button>
  );
}

export default function TemplateGallery({
  templates,
  selectedId,
  onSelect,
  language,
}: TemplateGalleryProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 20,
        padding: '8px 0',
      }}
    >
      {templates.map((t) => (
        <GalleryCard
          key={t.meta.id}
          template={t}
          isSelected={t.meta.id === selectedId}
          language={language}
          onSelect={() => onSelect(t.meta.id)}
        />
      ))}
    </div>
  );
}
