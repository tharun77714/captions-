/**
 * SUBTITLE SCHEMA V2 — Single Source of Truth
 *
 * Every UI component, every store action, every export renderer
 * consumes types defined in this file. No exceptions.
 *
 * Schema version is tracked via `_version` field for migration.
 */

// ═══════════════════════════════════════════════════════════════════════
// FONT
// ═══════════════════════════════════════════════════════════════════════

export interface FontConfig {
  family: string;
  weight: number; // 100–900
  italic: boolean;
  underline: boolean;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

// ═══════════════════════════════════════════════════════════════════════
// COLOR
// ═══════════════════════════════════════════════════════════════════════

export interface ColorConfig {
  mode: 'solid' | 'gradient';
  solid: string; // hex or rgba
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number; // degrees, default 90
}

// ═══════════════════════════════════════════════════════════════════════
// EFFECTS
// ═══════════════════════════════════════════════════════════════════════

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number; // px, 0–10
}

export interface ShadowConfig {
  color: string; // rgba
  blur: number; // px, 0–50
  offsetX: number; // px
  offsetY: number; // px
}

export interface BackgroundConfig {
  enabled: boolean;
  color: string; // rgba
  opacity: number; // 0–1
  paddingX: number; // px
  paddingY: number; // px
  borderRadius: number; // px
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════

export type TransitionType =
  | 'none'
  | 'fade'
  | 'pop'
  | 'scale'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'flip-x'
  | 'flip-y'
  | 'spin'
  | 'blur'
  | 'bounce'
  | 'elastic';

export const TRANSITION_TYPES: TransitionType[] = [
  'none', 'fade', 'pop', 'scale',
  'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'zoom', 'flip-x', 'flip-y', 'spin', 'blur', 'bounce', 'elastic',
];

export interface TransitionConfig {
  type: TransitionType;
  target: 'word' | 'line';
  speedMode: 'dynamic' | 'fixed';
  speed: number; // 0–50
}

// ═══════════════════════════════════════════════════════════════════════
// CAPTION DISPLAY
// ═══════════════════════════════════════════════════════════════════════

export interface CaptionConfig {
  maxWordsPerLine: number; // 0 = unlimited
  maxCharsPerLine: number; // default 24
  linesLimit: 1 | 2;
  captionDelay: number; // seconds, -5 to +5
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════

export type ExportResolution = '720P' | '1080P' | '4K';
export type ExportFormat = 'video' | 'srt' | 'alpha';

export interface ExportConfig {
  resolution: ExportResolution;
  format: ExportFormat;
}

// ═══════════════════════════════════════════════════════════════════════
// HIGHLIGHT MODES
// ═══════════════════════════════════════════════════════════════════════

export type HighlightMode =
  | 'none'
  | 'color'
  | 'scale'
  | 'underline'
  | 'background'
  | 'karaoke';

export const HIGHLIGHT_MODES: HighlightMode[] = [
  'none', 'color', 'scale', 'underline', 'background', 'karaoke',
];

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE SUBTITLE STYLE V2
// ═══════════════════════════════════════════════════════════════════════

export interface SubtitleStyleV2 {
  _version: 2;

  // Typography
  font: FontConfig;
  fontSize: number; // px, 12–72
  letterSpacing: number; // px, -5 to 20
  wordSpacing: number; // px, -5 to 20
  lineSpacing: number; // multiplier, 0.8–3.0

  // Color
  textColor: ColorConfig;

  // Effects
  stroke: StrokeConfig;
  shadow: ShadowConfig;
  background: BackgroundConfig;
  blur: number; // px, 0–50 (applied to inactive words)

  // Layout
  alignment: 'left' | 'center' | 'right';
  positionX: number; // -50 to 50
  positionY: number; // -50 to 50

  // Highlight
  highlightMode: HighlightMode;
  activeWordColor: string; // hex
  inactiveOpacity: number; // 0–1

  // Transition
  transition: TransitionConfig;
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE
// ═══════════════════════════════════════════════════════════════════════

export type TemplateCategory = 'featured' | 'creator' | 'minimal' | 'bold' | 'cinematic' | 'lifestyle' | 'professional' | 'viral';

export interface TemplateConfig {
  id: string;
  name: string;
  category: TemplateCategory;
  isNew: boolean;
  style: SubtitleStyleV2;
}

// ═══════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_FONT: FontConfig = {
  family: 'Inter',
  weight: 700,
  italic: false,
  underline: false,
  textTransform: 'none',
};

export const DEFAULT_TRANSITION: TransitionConfig = {
  type: 'none',
  target: 'word',
  speedMode: 'dynamic',
  speed: 25,
};

export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  maxWordsPerLine: 0,
  maxCharsPerLine: 24,
  linesLimit: 1,
  captionDelay: 0,
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  resolution: '1080P',
  format: 'video',
};

export const DEFAULT_STYLE: SubtitleStyleV2 = {
  _version: 2,
  font: { ...DEFAULT_FONT },
  fontSize: 32,
  letterSpacing: 0,
  wordSpacing: 0,
  lineSpacing: 1.375,
  textColor: { mode: 'solid', solid: '#FFFFFF' },
  stroke: { enabled: false, color: '#000000', width: 0 },
  shadow: { color: 'rgba(0, 0, 0, 0.5)', blur: 4, offsetX: 0, offsetY: 0 },
  background: { enabled: false, color: 'rgba(0, 0, 0, 0.75)', opacity: 0.75, paddingX: 12, paddingY: 6, borderRadius: 6 },
  blur: 0,
  alignment: 'center',
  positionX: 0,
  positionY: 0,
  highlightMode: 'none',
  activeWordColor: '#facc15',
  inactiveOpacity: 0.5,
  transition: { ...DEFAULT_TRANSITION },
};

// ═══════════════════════════════════════════════════════════════════════
// V1 COMPATIBILITY — MIGRATION
// ═══════════════════════════════════════════════════════════════════════

/** V1 type (current production schema in Supabase) */
export interface SubtitleStyleV1 {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  alignment: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom';
  highlightMode: HighlightMode;
}

function extractRgbaOpacity(rgba?: string): number {
  if (!rgba) return 1.0;
  if (rgba.startsWith('rgba')) {
    const parts = rgba.replace('rgba(', '').replace(')', '').split(',');
    if (parts.length === 4) return parseFloat(parts[3].trim());
  }
  return 1.0;
}

function isBackgroundVisible(bgColor: string): boolean {
  if (!bgColor || bgColor === 'transparent') return false;
  if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'rgba(0,0,0,0)') return false;
  return extractRgbaOpacity(bgColor) > 0;
}

export function migrateV1ToV2(v1: SubtitleStyleV1): SubtitleStyleV2 {
  return {
    _version: 2,
    font: {
      family: v1.fontFamily || 'Inter',
      weight: v1.fontWeight,
      italic: false,
      underline: false,
      textTransform: 'none',
    },
    fontSize: v1.fontSize,
    letterSpacing: 0,
    wordSpacing: 0,
    lineSpacing: 1.375,
    textColor: { mode: 'solid', solid: v1.textColor },
    stroke: {
      enabled: v1.strokeWidth > 0,
      color: v1.strokeColor,
      width: v1.strokeWidth,
    },
    shadow: {
      color: v1.shadowColor,
      blur: v1.shadowBlur,
      offsetX: 0,
      offsetY: 0,
    },
    background: {
      enabled: isBackgroundVisible(v1.backgroundColor),
      color: v1.backgroundColor,
      opacity: extractRgbaOpacity(v1.backgroundColor),
      paddingX: 12,
      paddingY: 6,
      borderRadius: 6,
    },
    blur: 0,
    alignment: v1.alignment,
    positionX: 0,
    positionY: v1.position === 'top' ? -40 : v1.position === 'center' ? 0 : 40,
    highlightMode: v1.highlightMode,
    activeWordColor: '#facc15',
    inactiveOpacity: v1.highlightMode === 'none' ? 1.0 : 0.5,
    transition: { ...DEFAULT_TRANSITION },
  };
}

export function isV2(style: unknown): style is SubtitleStyleV2 {
  return (style as SubtitleStyleV2)?._version === 2;
}

export function ensureV2(style: unknown): SubtitleStyleV2 {
  if (isV2(style)) {
    // Self-heal corrupted double-nested colors from previous bugs
    const v2 = style as any;
    if (v2.textColor?.solid && typeof v2.textColor.solid === 'object') {
      v2.textColor.solid = typeof v2.textColor.solid.solid === 'string' 
        ? v2.textColor.solid.solid 
        : '#FFFFFF';
    }
    return v2 as SubtitleStyleV2;
  }
  return migrateV1ToV2(style as SubtitleStyleV1);
}

/** Type guard for valid TransitionType */
export function isValidTransitionType(t: string): t is TransitionType {
  return TRANSITION_TYPES.includes(t as TransitionType);
}

/** Sanitize unknown transition type to valid value */
export function sanitizeTransitionType(t: string): TransitionType {
  return isValidTransitionType(t) ? t : 'none';
}
