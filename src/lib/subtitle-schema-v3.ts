/**
 * SUBTITLE SCHEMA V3 — Word-Level & Line-Level Styling
 *
 * Extends V2 with per-word and per-line style overrides.
 * Style resolution order: Project → Template → Line → Word
 * Lowest level wins (most specific override takes precedence).
 *
 * Schema version tracked via `_version: 3` field.
 */

import type {
  SubtitleStyleV2,
  FontConfig,
  ColorConfig,
  StrokeConfig,
  ShadowConfig,
  BackgroundConfig,
  TransitionConfig,
  HighlightMode,
} from './subtitle-schema-v2';
import { DEFAULT_STYLE, ensureV2 } from './subtitle-schema-v2';

// Re-export V2 types that are still used
export type { FontConfig, ColorConfig, StrokeConfig, ShadowConfig, BackgroundConfig, TransitionConfig, HighlightMode };

// ═══════════════════════════════════════════════════════════════════════
// WORD ANIMATION
// ═══════════════════════════════════════════════════════════════════════

export type WordAnimation =
  | 'none'
  | 'fadeIn'
  | 'fadeOut'
  | 'pop'
  | 'bounce'
  | 'scale'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'blurIn'
  | 'blurOut'
  | 'shake'
  | 'glow'
  | 'pulse'
  | 'typewriter';

export const WORD_ANIMATIONS: WordAnimation[] = [
  'none', 'fadeIn', 'fadeOut', 'pop', 'bounce', 'scale',
  'slideUp', 'slideDown', 'slideLeft', 'slideRight',
  'blurIn', 'blurOut', 'shake', 'glow', 'pulse', 'typewriter',
];

export const ANIMATION_LABELS: Record<WordAnimation, string> = {
  none: 'None',
  fadeIn: 'Fade In',
  fadeOut: 'Fade Out',
  pop: 'Pop',
  bounce: 'Bounce',
  scale: 'Scale',
  slideUp: 'Slide Up',
  slideDown: 'Slide Down',
  slideLeft: 'Slide Left',
  slideRight: 'Slide Right',
  blurIn: 'Blur In',
  blurOut: 'Blur Out',
  shake: 'Shake',
  glow: 'Glow',
  pulse: 'Pulse',
  typewriter: 'Typewriter',
};

export const ANIMATION_ICONS: Record<WordAnimation, string> = {
  none: '—',
  fadeIn: '◐',
  fadeOut: '◑',
  pop: '●',
  bounce: '⌁',
  scale: '⊕',
  slideUp: '↑',
  slideDown: '↓',
  slideLeft: '←',
  slideRight: '→',
  blurIn: '◉',
  blurOut: '◎',
  shake: '⟿',
  glow: '✦',
  pulse: '◈',
  typewriter: '▎',
};

// ═══════════════════════════════════════════════════════════════════════
// GRADIENT CONFIG
// ═══════════════════════════════════════════════════════════════════════

export interface GradientStop {
  color: string;    // hex or rgba
  position: number; // 0–100 percentage
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle: number;    // degrees, 0–360 (for linear)
  stops: GradientStop[];
}

// ═══════════════════════════════════════════════════════════════════════
// WORD STYLE OVERRIDE (Sparse — only set properties override parent)
// ═══════════════════════════════════════════════════════════════════════

export interface WordStyleOverride {
  // Typography
  fontFamily?: string;
  fontWeight?: number;      // 100–900
  fontSize?: number;        // px
  italic?: boolean;
  underline?: boolean;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;   // px

  // Color
  textColor?: string;       // hex or rgba
  gradient?: GradientConfig;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Background
  backgroundColor?: string;
  backgroundGradient?: GradientConfig;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  paddingX?: number;
  paddingY?: number;

  // Transform
  x?: number;               // px offset
  y?: number;               // px offset
  rotation?: number;         // degrees
  scaleX?: number;           // multiplier (1 = 100%)
  scaleY?: number;           // multiplier
  opacity?: number;          // 0–1

  // Animation
  animation?: WordAnimation;
  animationDelay?: number;   // ms
  animationDuration?: number; // ms

  // AI Semantic
  emoji?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SEGMENT (LINE) STYLE OVERRIDE
// ═══════════════════════════════════════════════════════════════════════

export interface SegmentStyleOverride {
  // Typography
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  italic?: boolean;
  underline?: boolean;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;

  // Color
  textColor?: string;
  gradient?: GradientConfig;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Background
  backgroundColor?: string;
  backgroundGradient?: GradientConfig;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  paddingX?: number;
  paddingY?: number;

  // Transform
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;

  // Animation
  animation?: WordAnimation;
  animationDelay?: number;
  animationDuration?: number;

  // AI Semantic additions
  emoji?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// STYLE OVERRIDES MAP
// ═══════════════════════════════════════════════════════════════════════

export interface StyleOverrides {
  wordStyles: Record<string, WordStyleOverride>;       // wordId → style overrides
  segmentStyles: Record<number, SegmentStyleOverride>; // segmentId → style overrides
}

export const EMPTY_OVERRIDES: StyleOverrides = {
  wordStyles: {},
  segmentStyles: {},
};

// ═══════════════════════════════════════════════════════════════════════
// SUBTITLE STYLE V3 — Extends V2 with overrides
// ═══════════════════════════════════════════════════════════════════════

export interface SubtitleStyleV3 extends Omit<SubtitleStyleV2, '_version'> {
  _version: 3;
  overrides: StyleOverrides;
  activePreset?: {
    id: string;
    version: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RESOLVED WORD STYLE — Fully computed style for a single word
// ═══════════════════════════════════════════════════════════════════════

export interface ResolvedWordStyle {
  // Typography
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  italic: boolean;
  underline: boolean;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing: number;

  // Color
  textColor: string;
  gradient: GradientConfig | null;
  strokeColor: string;
  strokeWidth: number;
  strokeEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Background
  backgroundColor: string;
  backgroundGradient: GradientConfig | null;
  backgroundEnabled: boolean;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  paddingX: number;
  paddingY: number;

  // Transform
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;

  // Animation
  animation: WordAnimation;
  animationDelay: number;
  animationDuration: number;

  // AI Semantic additions
  emoji?: string;

  // Meta (for UI indication)
  hasWordOverride: boolean;
  hasSegmentOverride: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_STYLE_V3: SubtitleStyleV3 = {
  ...DEFAULT_STYLE,
  _version: 3,
  overrides: { ...EMPTY_OVERRIDES },
};

// ═══════════════════════════════════════════════════════════════════════
// STYLE RESOLUTION — Cascade: Project → Line → Word
// ═══════════════════════════════════════════════════════════════════════

import { evaluatePresetRule } from './preset-engine';
import type { SemanticTag } from './semantic-engine';

/**
 * Resolves the final computed style for a specific word.
 * Applies the full inheritance chain:
 *   Project Style (SubtitleStyleV3) → Preset Rule → Segment Override → Word Override
 *
 * Only explicitly set overrides take effect; undefined properties
 * inherit from the parent level.
 */
export function resolveWordStyle(
  projectStyle: SubtitleStyleV3,
  segmentId: number,
  wordId: string,
  semanticTag?: SemanticTag
): ResolvedWordStyle {
  const segOverride = projectStyle.overrides.segmentStyles[segmentId];
  const wordOverride = projectStyle.overrides.wordStyles[wordId];

  // Dynamic Rule Evaluation (JIT)
  let presetOverride: Partial<ResolvedWordStyle> | null = null;
  if (projectStyle.activePreset && semanticTag) {
    presetOverride = evaluatePresetRule(
      semanticTag, 
      projectStyle.activePreset.id, 
      projectStyle.activePreset.version
    );
  }

  const hasSegmentOverride = !!segOverride && Object.keys(segOverride).length > 0;
  const hasWordOverride = !!wordOverride && Object.keys(wordOverride).length > 0;

  // Helper: resolve a property through the cascade
  const resolve = <T>(
    wordVal: T | undefined,
    segVal: T | undefined,
    presetVal: T | undefined,
    projectVal: T,
  ): T => {
    if (wordVal !== undefined) return wordVal;
    if (segVal !== undefined) return segVal;
    if (presetVal !== undefined) return presetVal;
    return projectVal;
  };

  return {
    // Typography
    fontFamily: resolve(wordOverride?.fontFamily, segOverride?.fontFamily, presetOverride?.fontFamily, projectStyle.font.family),
    fontWeight: resolve(wordOverride?.fontWeight, segOverride?.fontWeight, presetOverride?.fontWeight, projectStyle.font.weight),
    fontSize: resolve(wordOverride?.fontSize, segOverride?.fontSize, presetOverride?.fontSize, projectStyle.fontSize),
    italic: resolve(wordOverride?.italic, segOverride?.italic, presetOverride?.italic, projectStyle.font.italic),
    underline: resolve(wordOverride?.underline, segOverride?.underline, presetOverride?.underline, projectStyle.font.underline),
    textTransform: resolve(wordOverride?.textTransform, segOverride?.textTransform, presetOverride?.textTransform, projectStyle.font.textTransform),
    letterSpacing: resolve(wordOverride?.letterSpacing, segOverride?.letterSpacing, presetOverride?.letterSpacing, projectStyle.letterSpacing),

    // Color
    textColor: resolve(wordOverride?.textColor, segOverride?.textColor, presetOverride?.textColor, projectStyle.textColor.solid),
    gradient: resolve(
      wordOverride?.gradient, 
      segOverride?.gradient, 
      presetOverride?.gradient,
      projectStyle.textColor.mode === 'gradient' ? {
        type: 'linear',
        angle: projectStyle.textColor.gradientAngle ?? 90,
        stops: [
          { color: projectStyle.textColor.gradientFrom || '#ffffff', position: 0 },
          { color: projectStyle.textColor.gradientTo || '#000000', position: 100 }
        ]
      } : null
    ),
    strokeColor: resolve(wordOverride?.strokeColor, segOverride?.strokeColor, presetOverride?.strokeColor, projectStyle.stroke.color),
    strokeWidth: resolve(wordOverride?.strokeWidth, segOverride?.strokeWidth, presetOverride?.strokeWidth, projectStyle.stroke.width),
    strokeEnabled: projectStyle.stroke.enabled || 
      (wordOverride?.strokeWidth !== undefined && wordOverride.strokeWidth > 0) ||
      (segOverride?.strokeWidth !== undefined && segOverride.strokeWidth > 0) ||
      (presetOverride?.strokeWidth !== undefined && presetOverride.strokeWidth > 0),
    shadowColor: resolve(wordOverride?.shadowColor, segOverride?.shadowColor, presetOverride?.shadowColor, projectStyle.shadow.color),
    shadowBlur: resolve(wordOverride?.shadowBlur, segOverride?.shadowBlur, presetOverride?.shadowBlur, projectStyle.shadow.blur),
    shadowOffsetX: resolve(wordOverride?.shadowOffsetX, segOverride?.shadowOffsetX, presetOverride?.shadowOffsetX, projectStyle.shadow.offsetX),
    shadowOffsetY: resolve(wordOverride?.shadowOffsetY, segOverride?.shadowOffsetY, presetOverride?.shadowOffsetY, projectStyle.shadow.offsetY),

    // Background
    backgroundColor: resolve(wordOverride?.backgroundColor, segOverride?.backgroundColor, presetOverride?.backgroundColor, projectStyle.background.color),
    backgroundGradient: resolve(wordOverride?.backgroundGradient, segOverride?.backgroundGradient, presetOverride?.backgroundGradient, null),
    backgroundEnabled: projectStyle.background.enabled ||
      wordOverride?.backgroundColor !== undefined ||
      segOverride?.backgroundColor !== undefined ||
      presetOverride?.backgroundColor !== undefined,
    borderRadius: resolve(wordOverride?.borderRadius, segOverride?.borderRadius, presetOverride?.borderRadius, projectStyle.background.borderRadius),
    borderWidth: resolve(wordOverride?.borderWidth, segOverride?.borderWidth, presetOverride?.borderWidth, 0),
    borderColor: resolve(wordOverride?.borderColor, segOverride?.borderColor, presetOverride?.borderColor, 'transparent'),
    paddingX: resolve(wordOverride?.paddingX, segOverride?.paddingX, presetOverride?.paddingX, projectStyle.background.paddingX),
    paddingY: resolve(wordOverride?.paddingY, segOverride?.paddingY, presetOverride?.paddingY, projectStyle.background.paddingY),

    // Transform
    x: resolve(wordOverride?.x, segOverride?.x, presetOverride?.x, 0),
    y: resolve(wordOverride?.y, segOverride?.y, presetOverride?.y, 0),
    rotation: resolve(wordOverride?.rotation, segOverride?.rotation, presetOverride?.rotation, 0),
    scaleX: resolve(wordOverride?.scaleX, segOverride?.scaleX, presetOverride?.scaleX, 1),
    scaleY: resolve(wordOverride?.scaleY, segOverride?.scaleY, presetOverride?.scaleY, 1),
    opacity: resolve(wordOverride?.opacity, segOverride?.opacity, presetOverride?.opacity, 1),

    // Animation
    animation: resolve(wordOverride?.animation, segOverride?.animation, presetOverride?.animation, 'none'),
    animationDelay: resolve(wordOverride?.animationDelay, segOverride?.animationDelay, presetOverride?.animationDelay, 0),
    animationDuration: resolve(wordOverride?.animationDuration, segOverride?.animationDuration, presetOverride?.animationDuration, 0),

    // AI Semantic
    emoji: resolve(wordOverride?.emoji, segOverride?.emoji, presetOverride?.emoji, semanticTag?.suggestedEmoji),

    // Meta
    hasWordOverride,
    hasSegmentOverride,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// V2 → V3 MIGRATION
// ═══════════════════════════════════════════════════════════════════════

export function migrateV2ToV3(v2: SubtitleStyleV2): SubtitleStyleV3 {
  return {
    ...v2,
    _version: 3,
    overrides: { wordStyles: {}, segmentStyles: {} },
  };
}

export function isV3(style: unknown): style is SubtitleStyleV3 {
  return (style as SubtitleStyleV3)?._version === 3;
}

/**
 * Ensures the style object is V3. Handles:
 * - V1 → V2 → V3 migration
 * - V2 → V3 migration
 * - V3 passthrough with self-healing
 */
export function ensureV3(style: unknown): SubtitleStyleV3 {
  if (isV3(style)) {
    // Self-heal: ensure overrides object exists
    const v3 = style as SubtitleStyleV3;
    if (!v3.overrides) {
      v3.overrides = { wordStyles: {}, segmentStyles: {} };
    }
    if (!v3.overrides.wordStyles) v3.overrides.wordStyles = {};
    if (!v3.overrides.segmentStyles) v3.overrides.segmentStyles = {};
    return v3;
  }
  // Ensure V2 first, then migrate to V3
  const v2 = ensureV2(style);
  return migrateV2ToV3(v2);
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/** Check if a word has any style overrides */
export function wordHasOverrides(style: SubtitleStyleV3, wordId: string): boolean {
  const override = style.overrides.wordStyles[wordId];
  return !!override && Object.keys(override).length > 0;
}

/** Check if a segment has any style overrides */
export function segmentHasOverrides(style: SubtitleStyleV3, segmentId: number): boolean {
  const override = style.overrides.segmentStyles[segmentId];
  return !!override && Object.keys(override).length > 0;
}

/** Remove all undefined values from an override to keep it clean */
export function cleanOverride<T extends Record<string, unknown>>(override: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

/** Get all unique font families used across all overrides (for export font loading) */
export function getAllUsedFonts(style: SubtitleStyleV3): string[] {
  const fonts = new Set<string>();
  fonts.add(style.font.family);

  if (style.activePreset) {
    const { PRESET_FONT_MAP } = require('./preset-engine');
    if (PRESET_FONT_MAP[style.activePreset.id]) {
      fonts.add(PRESET_FONT_MAP[style.activePreset.id]);
    }
  }

  for (const override of Object.values(style.overrides.segmentStyles)) {
    if (override.fontFamily) fonts.add(override.fontFamily);
  }
  for (const override of Object.values(style.overrides.wordStyles)) {
    if (override.fontFamily) fonts.add(override.fontFamily);
  }

  return Array.from(fonts);
}

/** Convert ResolvedWordStyle to CSS properties for DOM rendering */
export function resolvedStyleToCSS(resolved: ResolvedWordStyle): React.CSSProperties {
  const css: React.CSSProperties = {
    fontFamily: `"${resolved.fontFamily}", sans-serif`,
    fontWeight: resolved.fontWeight,
    fontSize: `${resolved.fontSize}px`,
    fontStyle: resolved.italic ? 'italic' : 'normal',
    textDecoration: resolved.underline ? 'underline' : 'none',
    textTransform: resolved.textTransform === 'none' ? undefined : resolved.textTransform,
    letterSpacing: resolved.letterSpacing !== 0 ? `${resolved.letterSpacing}px` : undefined,
    color: resolved.textColor,
    opacity: resolved.opacity,
  };

  // Gradient text
  if (resolved.gradient) {
    const stops = resolved.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    if (resolved.gradient.type === 'linear') {
      css.background = `linear-gradient(${resolved.gradient.angle}deg, ${stops})`;
    } else {
      css.background = `radial-gradient(circle, ${stops})`;
    }
    css.WebkitBackgroundClip = 'text';
    css.WebkitTextFillColor = 'transparent';
    css.backgroundClip = 'text';
  }

  // Stroke
  if (resolved.strokeEnabled && resolved.strokeWidth > 0) {
    css.WebkitTextStroke = `${resolved.strokeWidth}px ${resolved.strokeColor}`;
  }

  // Shadow
  if (resolved.shadowBlur > 0 || resolved.shadowOffsetX !== 0 || resolved.shadowOffsetY !== 0) {
    css.textShadow = `${resolved.shadowOffsetX}px ${resolved.shadowOffsetY}px ${resolved.shadowBlur}px ${resolved.shadowColor}`;
  }

  // Transform
  const transforms: string[] = [];
  if (resolved.x !== 0) transforms.push(`translateX(${resolved.x}px)`);
  if (resolved.y !== 0) transforms.push(`translateY(${resolved.y}px)`);
  if (resolved.rotation !== 0) transforms.push(`rotate(${resolved.rotation}deg)`);
  if (resolved.scaleX !== 1 || resolved.scaleY !== 1) transforms.push(`scale(${resolved.scaleX}, ${resolved.scaleY})`);
  if (transforms.length > 0) {
    css.transform = transforms.join(' ');
    css.display = 'inline-block'; // Required for transform on inline elements
  }

  return css;
}

/** Convert ResolvedWordStyle to background container CSS */
export function resolvedStyleToBackgroundCSS(resolved: ResolvedWordStyle): React.CSSProperties | null {
  if (!resolved.backgroundEnabled && !resolved.backgroundGradient) return null;

  const css: React.CSSProperties = {
    borderRadius: `${resolved.borderRadius}px`,
    padding: `${resolved.paddingY}px ${resolved.paddingX}px`,
  };

  if (resolved.backgroundGradient) {
    const stops = resolved.backgroundGradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
    css.background = resolved.backgroundGradient.type === 'linear'
      ? `linear-gradient(${resolved.backgroundGradient.angle}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  } else if (resolved.backgroundEnabled) {
    css.backgroundColor = resolved.backgroundColor;
  }

  if (resolved.borderWidth > 0) {
    css.border = `${resolved.borderWidth}px solid ${resolved.borderColor}`;
  }

  return css;
}
