'use client';

/**
 * TEMPLATE LAB CLIENT — Main lab shell (STATIC)
 *
 * Owns:
 * - Storyboard state, position, face-safe overlays
 * - Language/aspect-ratio/background switching
 * - Local video upload and object-URL cleanup
 * - Safe-area guide toggle
 * - Template selection
 * - Info panel
 *
 * Development-only.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TEMPLATE_REGISTRY } from '@/lib/template-lab/registry';
import { FIXTURE_FULL_TEXT, getFixtureSegment } from '@/lib/template-lab/fixtures';
import { getGroupedWords, getSecondaryGroupedWords } from '@/lib/template-lab/grouping';
import type { AspectRatio, LabLanguage, BackgroundType, StoryboardState } from '@/lib/template-lab/types';
import type { PositionAnchor } from '@/lib/template-lab/metrics';
import type { FaceSafePreset } from './TemplateStage';
import TemplateStage from './TemplateStage';
import TemplateGallery from './TemplateGallery';

const ASPECT_RATIOS: AspectRatio[] = ['9:16', '1:1', '16:9'];
const LANGUAGES: { value: LabLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'mixed', label: 'Mixed' },
];
const BACKGROUNDS: { value: BackgroundType; label: string }[] = [
  { value: 'dark', label: 'Dark Studio' },
  { value: 'light', label: 'Light Studio' },
  { value: 'colorful', label: 'Colorful' },
  { value: 'video', label: 'Local Video' },
];
const STATES: { value: StoryboardState; label: string }[] = [
  { value: 'entry', label: '1. Entry' },
  { value: 'active', label: '2. Active' },
  { value: 'completed', label: '3. Completed' },
  { value: 'stress', label: '4. Stress (Long)' },
];
const POSITIONS: { value: PositionAnchor; label: string }[] = [
  { value: 'upper', label: 'Upper' },
  { value: 'centre', label: 'Centre' },
  { value: 'lower', label: 'Lower' },
];
const FACE_SAFE_PRESETS: { value: FaceSafePreset; label: string }[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'left', label: 'Left Face' },
  { value: 'centre', label: 'Centre Face' },
  { value: 'right', label: 'Right Face' },
  { value: 'product-bottom', label: 'Product Bottom' },
];

// Inline control button styles
const btnBase: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  padding: '5px 12px',
  borderRadius: 6,
  border: '1.5px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  transition: 'background 0.12s, color 0.12s',
};
const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(139,92,246,0.3)',
  border: '1.5px solid rgba(139,92,246,0.6)',
  color: '#e2d9f3',
};

export default function TemplateLabClient() {
  const [selectedId, setSelectedId] = useState(TEMPLATE_REGISTRY[0]?.meta.id || '');
  const [language, setLanguage] = useState<LabLanguage>('english');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('dark');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // New Static Controls
  const [storyboardState, setStoryboardState] = useState<StoryboardState>('active');
  const [position, setPosition] = useState<PositionAnchor>('centre');
  const [faceSafePreset, setFaceSafePreset] = useState<FaceSafePreset>('clear');

  const videoInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or change
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setBackgroundType('video');
  };

  const selectedTemplate = TEMPLATE_REGISTRY.find(t => t.meta.id === selectedId);
  const segment = getFixtureSegment(language, storyboardState);
  
  const grouped = getGroupedWords(segment.words, storyboardState);
  const secondaryGrouped = segment.secondaryWords 
    ? getSecondaryGroupedWords(grouped, segment.secondaryWords, storyboardState) 
    : undefined;

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: '#09090b',
        color: '#f4f0fa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Vidyut Template Lab
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            STATIC STORYBOARDS • {TEMPLATE_REGISTRY.length} PROTOTYPES
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowSafeArea(!showSafeArea)}
            style={showSafeArea ? btnActive : btnBase}
          >
            Safe Area
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={showInfo ? btnActive : btnBase}
          >
            Info
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left: Preview Stage & Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          
          {/* Stage Area */}
          <div style={{ flex: 1, padding: 32, position: 'relative', overflow: 'hidden' }}>
            {selectedTemplate ? (
              <TemplateStage
                template={selectedTemplate}
                grouped={grouped}
                aspectRatio={aspectRatio}
                language={segment.language}
                backgroundType={backgroundType}
                videoUrl={videoUrl}
                showSafeArea={showSafeArea}
                faceSafePreset={faceSafePreset}
                position={position}
                storyboardState={storyboardState}
                secondaryGrouped={secondaryGrouped}
                secondaryLanguage={segment.secondaryLanguage}
              />
            ) : (
              <div style={{ color: '#fff' }}>No templates registered</div>
            )}
          </div>

          {/* Bottom Toolbar (Static State Controls) */}
          <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 32, alignItems: 'center' }}>
            
            {/* Storyboard State */}
            <div style={{ display: 'flex', gap: 8 }}>
              {STATES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStoryboardState(s.value)}
                  style={storyboardState === s.value ? btnActive : btnBase}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Position */}
            <div style={{ display: 'flex', gap: 8 }}>
              {POSITIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPosition(p.value)}
                  style={position === p.value ? btnActive : btnBase}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Aspect Ratios */}
            <div style={{ display: 'flex', gap: 8 }}>
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  style={aspectRatio === ar ? btnActive : btnBase}
                >
                  {ar}
                </button>
              ))}
            </div>

          </div>

          {/* Secondary Toolbar (Language, BG, Obstacles) */}
          <div style={{ padding: '16px 32px', borderTop: '1px dashed rgba(255,255,255,0.05)', display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  style={language === l.value ? btnActive : btnBase}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Face Safe:</span>
              {FACE_SAFE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setFaceSafePreset(p.value)}
                  style={faceSafePreset === p.value ? btnActive : btnBase}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {BACKGROUNDS.map(bg => (
                <button
                  key={bg.value}
                  onClick={() => {
                    if (bg.value === 'video' && !videoUrl) {
                      videoInputRef.current?.click();
                    } else {
                      setBackgroundType(bg.value);
                    }
                  }}
                  style={backgroundType === bg.value ? btnActive : btnBase}
                >
                  {bg.label}
                </button>
              ))}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                style={{ display: 'none' }}
                onChange={handleVideoUpload}
              />
            </div>
          </div>
        </div>

        {/* Right: Gallery Sidebar */}
        <div style={{ width: 360, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#0f0f12' }}>
          <div style={{ padding: '20px 24px', fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.08em' }}>
            ARCHETYPES
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
            <TemplateGallery
              templates={TEMPLATE_REGISTRY}
              selectedId={selectedId}
              onSelect={setSelectedId}
              language={language}
            />
          </div>
        </div>
      </div>

      {/* Info Panel Overlay */}
      {showInfo && selectedTemplate && (
        <div style={{
          position: 'absolute', top: 80, right: 400, width: 380,
          background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
          padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          zIndex: 100
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{selectedTemplate.meta.name}</h2>
          <p style={{ margin: '0 0 20px', color: '#a0a0ab', fontSize: 14 }}>{selectedTemplate.meta.tagline}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 120, color: '#666' }}>ID</span>
              <span style={{ color: '#fff' }}>{selectedTemplate.meta.id}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 120, color: '#666' }}>Description</span>
              <span style={{ color: '#fff', lineHeight: 1.5 }}>{selectedTemplate.meta.description}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: 120, color: '#666' }}>Full Text</span>
              <span style={{ color: '#fff', lineHeight: 1.5 }}>{FIXTURE_FULL_TEXT[language]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
