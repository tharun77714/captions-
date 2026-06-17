'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { getTemplatesByCategory, getTemplateCategories } from '@/lib/templates-data';
import { sanitizeTransitionType } from '@/lib/subtitle-schema-v2';
import { FontPicker } from './font-picker';
import { GradientPicker } from './gradient-picker';
import {
  Type,
  Wand2,
  Activity,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpFromLine,
  Minus,
  ArrowDownFromLine,
  Move,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveWordStyle, type SubtitleStyleV3, type WordStyleOverride } from '@/lib/subtitle-schema-v3';

type Tab = 'templates' | 'text' | 'position' | 'transitions';

export function StylePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('text');

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/5 bg-zinc-900/30">
        <TabButton id="templates" label="Styles" icon={Wand2} current={activeTab} set={setActiveTab} />
        <TabButton id="text" label="Text" icon={Type} current={activeTab} set={setActiveTab} />
        <TabButton id="position" label="Position" icon={Move} current={activeTab} set={setActiveTab} />
        <TabButton id="transitions" label="Animate" icon={Activity} current={activeTab} set={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'text' && <TextTab />}
        {activeTab === 'position' && <PositionTab />}
        {activeTab === 'transitions' && <TransitionsTab />}
      </div>
    </div>
  );
}

function TabButton({
  id,
  label,
  icon: Icon,
  current,
  set,
}: {
  id: Tab;
  label: string;
  icon: React.ElementType;
  current: Tab;
  set: (t: Tab) => void;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => set(id)}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all relative',
        active
          ? 'text-violet-400'
          : 'text-zinc-500 hover:text-zinc-300'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[9px] font-semibold tracking-wider uppercase">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATES TAB
// ═══════════════════════════════════════════════════════════════════════

function TemplatesTab() {
  const { applyTemplate, activeTemplateId } = useEditorStore();
  const categories = getTemplateCategories();

  return (
    <div className="p-3 space-y-5">
      {categories.map((category) => {
        const templates = getTemplatesByCategory(category);
        if (templates.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">
              {category}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {templates.map((tmpl) => {
                const isActive = activeTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => applyTemplate(tmpl.id)}
                    className={cn(
                      'relative rounded-lg border overflow-hidden transition-all group',
                      'aspect-[16/10]',
                      isActive
                        ? 'border-violet-500 ring-1 ring-violet-500/40 shadow-lg shadow-violet-500/10'
                        : 'border-white/5 hover:border-white/15 hover:shadow-md'
                    )}
                  >
                    {/* Background gradient */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: tmpl.style.background.enabled
                          ? `linear-gradient(135deg, ${tmpl.style.background.color}40, ${tmpl.style.background.color}10)`
                          : 'linear-gradient(135deg, rgba(24,24,27,1), rgba(39,39,42,1))',
                      }}
                    />
                    {/* Template preview text */}
                    <div className="relative z-10 h-full flex items-center justify-center p-2">
                      <span
                        className="text-center leading-tight"
                        style={{
                          fontFamily: `"${tmpl.style.font.family}", sans-serif`,
                          fontSize: '11px',
                          fontWeight: tmpl.style.font.weight,
                          color: tmpl.style.textColor.solid,
                          textTransform: tmpl.style.font.textTransform === 'uppercase' ? 'uppercase' : 'none',
                          textShadow:
                            tmpl.style.shadow.blur > 0
                              ? `0 1px ${Math.min(tmpl.style.shadow.blur, 8)}px ${tmpl.style.shadow.color}`
                              : 'none',
                          WebkitTextStroke:
                            tmpl.style.stroke.enabled && tmpl.style.stroke.width > 0
                              ? `${Math.min(tmpl.style.stroke.width, 1)}px ${tmpl.style.stroke.color}`
                              : undefined,
                        }}
                      >
                        {tmpl.name}
                      </span>
                    </div>
                    {tmpl.isNew && (
                      <span className="absolute top-1 right-1 text-[7px] font-bold bg-violet-600 text-white px-1 py-0.5 rounded z-20">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TEXT TAB — Font, Size, Weight, Colors, Stroke, Shadow, Spacing
// ═══════════════════════════════════════════════════════════════════════

function TextTab() {
  const { subtitleStyle, setSubtitleStyleV2, selectedWordIds, updateSelectedWordsStyle, segments } = useEditorStore();

  const isOverrideMode = selectedWordIds.length > 0;
  
  const activeStyle = React.useMemo(() => {
    if (!isOverrideMode) return subtitleStyle;
    const firstWordId = selectedWordIds[0];
    const seg = segments.find(s => s.words.some(w => w.id === firstWordId));
    if (!seg) return subtitleStyle;
    
    const resolved = resolveWordStyle(subtitleStyle, seg.id, firstWordId);
    
    return {
      ...subtitleStyle,
      font: {
        ...subtitleStyle.font,
        family: resolved.fontFamily,
        weight: resolved.fontWeight,
        italic: resolved.italic,
        underline: resolved.underline,
        textTransform: resolved.textTransform,
      },
      fontSize: resolved.fontSize,
      letterSpacing: resolved.letterSpacing,
      wordSpacing: subtitleStyle.wordSpacing,
      lineSpacing: subtitleStyle.lineSpacing,
      textColor: { ...subtitleStyle.textColor, solid: resolved.textColor },
      shadow: {
        ...subtitleStyle.shadow,
        color: resolved.shadowColor,
        blur: resolved.shadowBlur,
        offsetX: resolved.shadowOffsetX,
        offsetY: resolved.shadowOffsetY,
      },
      background: {
        ...subtitleStyle.background,
        enabled: resolved.backgroundEnabled,
        color: resolved.backgroundColor,
        borderRadius: resolved.borderRadius,
      },
      stroke: {
        ...subtitleStyle.stroke,
        enabled: resolved.strokeEnabled,
        color: resolved.strokeColor,
        width: resolved.strokeWidth,
      },
      inactiveOpacity: resolved.opacity,
    } as SubtitleStyleV3;
  }, [subtitleStyle, isOverrideMode, selectedWordIds, segments]);

  const updateFont = (updates: Partial<typeof subtitleStyle.font>, wordUpdates: Partial<WordStyleOverride>) => {
    if (isOverrideMode) updateSelectedWordsStyle(wordUpdates);
    else setSubtitleStyleV2(s => ({ ...s, font: { ...s.font, ...updates } }));
  };

  const updateShadow = (updates: Partial<typeof subtitleStyle.shadow>, wordUpdates: Partial<WordStyleOverride>) => {
    if (isOverrideMode) updateSelectedWordsStyle(wordUpdates);
    else setSubtitleStyleV2(s => ({ ...s, shadow: { ...s.shadow, ...updates } }));
  };

  const updateStroke = (updates: Partial<typeof subtitleStyle.stroke>, wordUpdates: Partial<WordStyleOverride>) => {
    if (isOverrideMode) updateSelectedWordsStyle(wordUpdates);
    else setSubtitleStyleV2(s => ({ ...s, stroke: { ...s.stroke, ...updates } }));
  };
  
  const updateBackground = (updates: Partial<typeof subtitleStyle.background>, wordUpdates: Partial<WordStyleOverride>) => {
    if (isOverrideMode) updateSelectedWordsStyle(wordUpdates);
    else setSubtitleStyleV2(s => ({ ...s, background: { ...s.background, ...updates } }));
  };

  const updateTextColor = (config: import('@/lib/subtitle-schema-v2').ColorConfig) => {
    if (isOverrideMode) {
      if (config.mode === 'solid') {
        updateSelectedWordsStyle({ textColor: config.solid, gradient: undefined });
      } else {
        updateSelectedWordsStyle({
          textColor: undefined,
          gradient: {
            type: 'linear',
            angle: config.gradientAngle ?? 90,
            stops: [
              { color: config.gradientFrom || '#ffffff', position: 0 },
              { color: config.gradientTo || '#000000', position: 100 }
            ]
          }
        });
      }
    } else {
      setSubtitleStyleV2(s => ({ ...s, textColor: config }));
    }
  };

  const updateNumber = (key: keyof SubtitleStyleV3, wordKey: keyof WordStyleOverride, value: number) => {
    if (isOverrideMode) updateSelectedWordsStyle({ [wordKey]: value });
    else setSubtitleStyleV2(s => ({ ...s, [key]: value }));
  };

  return (
    <div className="p-3 space-y-4">
      {isOverrideMode && (
        <div className="bg-violet-500/20 text-violet-300 text-xs py-2 px-3 rounded-md flex items-center justify-between">
          <span>Editing {selectedWordIds.length} word(s)</span>
          <button onClick={() => useEditorStore.getState().clearWordSelection()} className="hover:text-white underline font-semibold">Clear</button>
        </div>
      )}
      {/* Font Family — with live preview */}
      <Section title="Font Family">
        <FontPicker
          value={activeStyle.font.family}
          onChange={(family) =>
            updateFont({ family }, { fontFamily: family })
          }
        />
      </Section>

      {/* Size + Weight Row */}
      <div className="grid grid-cols-2 gap-2">
        <Section title="Size">
          <SliderWithValue
            min={12}
            max={72}
            step={1}
            value={activeStyle.fontSize}
            onChange={(v) => updateNumber('fontSize', 'fontSize', v)}
            unit="px"
          />
        </Section>
        <Section title="Weight">
          <select
            value={activeStyle.font.weight}
            onChange={(e) =>
              updateFont({ weight: Number(e.target.value) }, { fontWeight: Number(e.target.value) })
            }
            className="w-full px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-md text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">SemiBold</option>
            <option value="700">Bold</option>
            <option value="800">ExtraBold</option>
            <option value="900">Black</option>
          </select>
        </Section>
      </div>

      {/* Text Style & Transform */}
      <Section title="Style & Transform">
        <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-md border border-white/5">
          <button
            onClick={() =>
              updateFont({ italic: !activeStyle.font.italic }, { italic: !activeStyle.font.italic })
            }
            className={cn(
              'flex-1 py-1 text-[11px] font-serif italic rounded transition-all',
              activeStyle.font.italic
                ? 'bg-zinc-800 text-violet-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() =>
              updateFont({ underline: !activeStyle.font.underline }, { underline: !activeStyle.font.underline })
            }
            className={cn(
              'flex-1 py-1 text-[11px] font-serif underline rounded transition-all',
              activeStyle.font.underline
                ? 'bg-zinc-800 text-violet-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Underline"
          >
            U
          </button>
          <div className="w-px bg-white/10 my-1 mx-1" />
          {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map((t) => (
            <button
              key={t}
              onClick={() =>
                updateFont({ textTransform: t }, { textTransform: t })
              }
              className={cn(
                'flex-1 py-1 text-[9px] font-semibold rounded transition-all',
                activeStyle.font.textTransform === t
                  ? 'bg-zinc-800 text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {t === 'none' ? 'Aa' : t === 'uppercase' ? 'AA' : t === 'lowercase' ? 'aa' : 'Aa'}
            </button>
          ))}
        </div>
      </Section>

      {/* Spacing Controls */}
      <Section title="Letter Spacing">
        <SliderWithValue
          min={-5}
          max={20}
          step={0.5}
          value={activeStyle.letterSpacing}
          onChange={(v) => updateNumber('letterSpacing', 'letterSpacing', v)}
          unit="px"
        />
      </Section>

      <Section title="Word Spacing">
        <SliderWithValue
          min={-5}
          max={30}
          step={1}
          value={activeStyle.wordSpacing}
          onChange={(v) => setSubtitleStyleV2((s) => ({ ...s, wordSpacing: v }))}
          unit="px"
        />
      </Section>

      <Section title="Line Height">
        <SliderWithValue
          min={0.8}
          max={3}
          step={0.05}
          value={activeStyle.lineSpacing}
          onChange={(v) => setSubtitleStyleV2((s) => ({ ...s, lineSpacing: v }))}
        />
      </Section>

      <div className="h-px bg-white/5" />

      {/* Colors */}
      <Section title="Text Color">
        <GradientPicker
          value={activeStyle.textColor}
          onChange={(config) => updateTextColor(config)}
        />
      </Section>

      <Section title="Active Word Color">
        <ColorPicker
          value={activeStyle.activeWordColor}
          onChange={(c) => setSubtitleStyleV2((s) => ({ ...s, activeWordColor: c }))}
        />
      </Section>

      <div className="h-px bg-white/5" />

      {/* Stroke */}
      <Section title="Stroke">
        <ToggleRow
          enabled={activeStyle.stroke.enabled}
          onChange={(v) =>
            updateStroke({ enabled: v }, { strokeWidth: v ? 1 : 0 })
          }
        />
        {activeStyle.stroke.enabled && (
          <div className="space-y-2 mt-2">
            <ColorPicker
              value={activeStyle.stroke.color}
              onChange={(c) =>
                updateStroke({ color: c }, { strokeColor: c })
              }
            />
            <SliderWithValue
              min={0}
              max={10}
              step={0.5}
              value={activeStyle.stroke.width}
              onChange={(v) =>
                updateStroke({ width: v }, { strokeWidth: v })
              }
              unit="px"
            />
          </div>
        )}
      </Section>

      {/* Shadow */}
      <Section title="Shadow">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-8">Blur</span>
            <SliderWithValue
              min={0}
              max={50}
              step={1}
              value={activeStyle.shadow.blur}
              onChange={(v) =>
                updateShadow({ blur: v }, { shadowBlur: v })
              }
              unit="px"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-8">X</span>
            <SliderWithValue
              min={-20}
              max={20}
              step={1}
              value={activeStyle.shadow.offsetX}
              onChange={(v) =>
                updateShadow({ offsetX: v }, { shadowOffsetX: v })
              }
              unit="px"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-8">Y</span>
            <SliderWithValue
              min={-20}
              max={20}
              step={1}
              value={activeStyle.shadow.offsetY}
              onChange={(v) =>
                updateShadow({ offsetY: v }, { shadowOffsetY: v })
              }
              unit="px"
            />
          </div>
          <ColorPicker
            value={activeStyle.shadow.color}
            onChange={(c) =>
              updateShadow({ color: c }, { shadowColor: c })
            }
          />
        </div>
      </Section>

      {/* Background Box */}
      <Section title="Background Box">
        <ToggleRow
          enabled={activeStyle.background.enabled}
          onChange={(v) =>
            updateBackground({ enabled: v }, { backgroundColor: v ? activeStyle.background.color : undefined })
          }
        />
        {activeStyle.background.enabled && (
          <div className="space-y-2 mt-2">
            <ColorPicker
              value={activeStyle.background.color}
              onChange={(c) =>
                updateBackground({ color: c }, { backgroundColor: c })
              }
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 w-12">Opacity</span>
              <SliderWithValue
                min={0}
                max={1}
                step={0.05}
                value={activeStyle.background.opacity}
                onChange={(v) =>
                  updateBackground({ opacity: v }, {})
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 w-12">Radius</span>
              <SliderWithValue
                min={0}
                max={24}
                step={1}
                value={activeStyle.background.borderRadius}
                onChange={(v) =>
                  updateBackground({ borderRadius: v }, { borderRadius: v })
                }
                unit="px"
              />
            </div>
          </div>
        )}
      </Section>

      {/* Inactive Word */}
      <Section title="Inactive Words">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-12">Opacity</span>
            <SliderWithValue
              min={0}
              max={1}
              step={0.05}
              value={activeStyle.inactiveOpacity}
              onChange={(v) => updateNumber('inactiveOpacity', 'opacity', v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-12">Blur</span>
            <SliderWithValue
              min={0}
              max={20}
              step={1}
              value={activeStyle.blur}
              onChange={(v) => setSubtitleStyleV2((s) => ({ ...s, blur: v }))}
              unit="px"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// POSITION TAB — Alignment, Position presets, X/Y, Anchors
// ═══════════════════════════════════════════════════════════════════════

function PositionTab() {
  const { subtitleStyle, setSubtitleStyleV2 } = useEditorStore();

  return (
    <div className="p-3 space-y-4">
      {/* Alignment */}
      <Section title="Text Alignment">
        <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-md border border-white/5">
          {([
            { value: 'left' as const, icon: AlignLeft },
            { value: 'center' as const, icon: AlignCenter },
            { value: 'right' as const, icon: AlignRight },
          ]).map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSubtitleStyleV2((s) => ({ ...s, alignment: value }))}
              className={cn(
                'flex-1 flex items-center justify-center py-2 rounded transition-all',
                subtitleStyle.alignment === value
                  ? 'bg-violet-600/20 text-violet-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </Section>

      {/* Quick Position Presets */}
      <Section title="Position Presets">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Top', x: 0, y: -35, icon: ArrowUpFromLine },
            { label: 'Center', x: 0, y: 0, icon: Minus },
            { label: 'Bottom', x: 0, y: 35, icon: ArrowDownFromLine },
          ].map((preset) => {
            const isActive =
              Math.abs(subtitleStyle.positionX - preset.x) < 2 &&
              Math.abs(subtitleStyle.positionY - preset.y) < 2;
            return (
              <button
                key={preset.label}
                onClick={() =>
                  setSubtitleStyleV2((s) => ({
                    ...s,
                    positionX: preset.x,
                    positionY: preset.y,
                  }))
                }
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all',
                  isActive
                    ? 'bg-violet-600/15 border-violet-500/40 text-violet-400'
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                )}
              >
                <preset.icon className="w-4 h-4" />
                <span className="text-[9px] font-semibold">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Anchor Grid — 9-point */}
      <Section title="Anchor Point">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-1 p-2 bg-zinc-900 rounded-lg border border-white/5">
            {[
              { x: -35, y: -35 },
              { x: 0, y: -35 },
              { x: 35, y: -35 },
              { x: -35, y: 0 },
              { x: 0, y: 0 },
              { x: 35, y: 0 },
              { x: -35, y: 35 },
              { x: 0, y: 35 },
              { x: 35, y: 35 },
            ].map((pos, idx) => {
              const isActive =
                Math.abs(subtitleStyle.positionX - pos.x) < 5 &&
                Math.abs(subtitleStyle.positionY - pos.y) < 5;
              return (
                <button
                  key={idx}
                  onClick={() =>
                    setSubtitleStyleV2((s) => ({
                      ...s,
                      positionX: pos.x,
                      positionY: pos.y,
                    }))
                  }
                  className={cn(
                    'w-6 h-6 rounded-sm transition-all',
                    isActive
                      ? 'bg-violet-500 shadow-sm shadow-violet-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  )}
                />
              );
            })}
          </div>
        </div>
        <p className="text-[9px] text-zinc-600 text-center mt-1">Click to snap subtitle position</p>
      </Section>

      {/* Manual X/Y */}
      <Section title="Position X">
        <SliderWithValue
          min={-50}
          max={50}
          step={1}
          value={subtitleStyle.positionX}
          onChange={(v) => setSubtitleStyleV2((s) => ({ ...s, positionX: v }))}
          unit="%"
        />
      </Section>

      <Section title="Position Y">
        <SliderWithValue
          min={-50}
          max={50}
          step={1}
          value={subtitleStyle.positionY}
          onChange={(v) => setSubtitleStyleV2((s) => ({ ...s, positionY: v }))}
          unit="%"
        />
      </Section>

      {/* Safe Margins Info */}
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-zinc-400 mb-1">
          <Crosshair className="w-3 h-3" />
          <span className="text-[10px] font-semibold">Safe Margins</span>
        </div>
        <p className="text-[9px] text-zinc-600 leading-relaxed">
          Drag the subtitle directly on the video preview to position it anywhere. 
          Use presets above for quick positioning. The export pipeline will match the exact placement.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSITIONS TAB — Highlight Mode + Entry Animations
// ═══════════════════════════════════════════════════════════════════════

const HIGHLIGHT_MODES = [
  { value: 'none', label: 'None', desc: 'No highlight' },
  { value: 'color', label: 'Color', desc: 'Change text color' },
  { value: 'scale', label: 'Scale', desc: 'Enlarge active word' },
  { value: 'underline', label: 'Underline', desc: 'Underline active word' },
  { value: 'background', label: 'Background', desc: 'Box behind word' },
  { value: 'karaoke', label: 'Karaoke', desc: 'Glow + scale + color' },
];

const ANIMATION_PRESETS = [
  { value: 'none', label: 'None', icon: '—' },
  { value: 'fade', label: 'Fade In', icon: '◐' },
  { value: 'pop', label: 'Pop', icon: '●' },
  { value: 'slide-up', label: 'Slide Up', icon: '↑' },
  { value: 'slide-down', label: 'Slide Down', icon: '↓' },
  { value: 'slide-left', label: 'Slide Left', icon: '←' },
  { value: 'slide-right', label: 'Slide Right', icon: '→' },
  { value: 'zoom', label: 'Zoom', icon: '⊕' },
];

function TransitionsTab() {
  const { subtitleStyle, setSubtitleStyleV2 } = useEditorStore();

  return (
    <div className="p-3 space-y-4">
      {/* Highlight Mode */}
      <Section title="Active Word Highlight">
        <div className="grid grid-cols-2 gap-1.5">
          {HIGHLIGHT_MODES.map((mode) => {
            const isActive = subtitleStyle.highlightMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() =>
                  setSubtitleStyleV2((s) => ({
                    ...s,
                    highlightMode: mode.value as any,
                  }))
                }
                className={cn(
                  'flex flex-col items-start p-2.5 rounded-lg border transition-all text-left',
                  isActive
                    ? 'bg-violet-600/15 border-violet-500/40 text-violet-300'
                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-300'
                )}
              >
                <span className="text-[10px] font-semibold">{mode.label}</span>
                <span className="text-[8px] text-zinc-600 mt-0.5">{mode.desc}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="h-px bg-white/5" />

      {/* Entry Animation */}
      <Section title="Entry Animation">
        <div className="grid grid-cols-4 gap-1.5">
          {ANIMATION_PRESETS.map((anim) => {
            const isActive = subtitleStyle.transition.type === anim.value;
            return (
              <button
                key={anim.value}
                onClick={() =>
                  setSubtitleStyleV2((s) => ({
                    ...s,
                    transition: {
                      ...s.transition,
                      type: sanitizeTransitionType(anim.value),
                    },
                  }))
                }
                className={cn(
                  'flex flex-col items-center gap-1 py-2 rounded-lg border transition-all',
                  isActive
                    ? 'bg-violet-600/15 border-violet-500/40 text-violet-400'
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                )}
              >
                <span className="text-base leading-none">{anim.icon}</span>
                <span className="text-[8px] font-medium">{anim.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {subtitleStyle.transition.type !== 'none' && (
        <>
          {/* Animation Target */}
          <Section title="Apply To">
            <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-md border border-white/5">
              {(['word', 'line'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setSubtitleStyleV2((s) => ({
                      ...s,
                      transition: { ...s.transition, target: t },
                    }))
                  }
                  className={cn(
                    'flex-1 py-1.5 text-[10px] font-semibold rounded transition-all',
                    subtitleStyle.transition.target === t
                      ? 'bg-zinc-800 text-violet-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {t === 'word' ? 'Per Word' : 'Per Line'}
                </button>
              ))}
            </div>
          </Section>

          {/* Speed Mode */}
          <Section title="Speed">
            <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-md border border-white/5 mb-2">
              {(['dynamic', 'fixed'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setSubtitleStyleV2((s) => ({
                      ...s,
                      transition: { ...s.transition, speedMode: m },
                    }))
                  }
                  className={cn(
                    'flex-1 py-1.5 text-[10px] font-semibold rounded transition-all',
                    subtitleStyle.transition.speedMode === m
                      ? 'bg-zinc-800 text-violet-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {m === 'dynamic' ? 'Sync Voice' : 'Fixed'}
                </button>
              ))}
            </div>
            {subtitleStyle.transition.speedMode === 'fixed' && (
              <SliderWithValue
                min={1}
                max={50}
                step={1}
                value={subtitleStyle.transition.speed}
                onChange={(v) =>
                  setSubtitleStyleV2((s) => ({
                    ...s,
                    transition: { ...s.transition, speed: v },
                  }))
                }
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
        {title}
      </label>
      {children}
    </div>
  );
}

function SliderWithValue({
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-5 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-zinc-800 rounded-full" />
        <div
          className="absolute h-1 bg-violet-600 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3 h-3 bg-white rounded-full border-2 border-violet-500 shadow-md pointer-events-none"
          style={{
            left: `${Math.max(0, Math.min(100, percentage))}%`,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-zinc-400 w-10 text-right tabular-nums">
        {step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value}
        {unit || ''}
      </span>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = ['#FFFFFF', '#000000', '#facc15', '#f87171', '#60a5fa', '#34d399', '#c084fc'];
  
  // Extract hex part if it's rgba or similar (very basic, for input type=color)
  let hexValue = value;
  if (value.startsWith('rgba') || value.startsWith('rgb')) {
      // Fallback for color input if it's not hex
      hexValue = '#ffffff'; 
  } else if (value.length > 7 && value.startsWith('#')) {
      hexValue = value.substring(0, 7);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative w-7 h-7 rounded-md overflow-hidden border border-white/10 cursor-pointer shrink-0">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: value }} />
        </div>
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-violet-500/50"
          placeholder="HEX/RGBA"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-4 h-4 rounded-full border border-white/10 shadow-sm transition-transform hover:scale-110"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'w-9 h-5 rounded-full transition-colors relative',
        enabled ? 'bg-violet-600' : 'bg-zinc-700'
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
