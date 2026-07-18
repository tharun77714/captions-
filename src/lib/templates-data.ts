/**
 * TEMPLATE REGISTRY — Data-driven template definitions
 *
 * All 54 Vidyut templates defined as pure data.
 * Adding template #55 requires ZERO UI code changes — just add an entry here.
 *
 * Style values derived from:
 * - Live Kalakaar editor DOM extraction (slider values, computed styles)
 * - Template preview card analysis (bold/shadow/uppercase feature flags)
 * - Kalakaar default baseline: fontSize=32, letterSpacing=-4, lineSpacing=1.2, blur=13
 */

import type {
  TemplateConfig,
  SubtitleStyleV2,
  TemplateCategory,
} from './subtitle-schema-v2';
import { DEFAULT_STYLE } from './subtitle-schema-v2';

// ─── Helper: Create a template from partial overrides ─────────────────
function tmpl(
  id: string,
  name: string,
  category: TemplateCategory,
  isNew: boolean,
  overrides: Partial<SubtitleStyleV2> & {
    font?: Partial<SubtitleStyleV2['font']>;
    textColor?: Partial<SubtitleStyleV2['textColor']>;
    stroke?: Partial<SubtitleStyleV2['stroke']>;
    shadow?: Partial<SubtitleStyleV2['shadow']>;
    background?: Partial<SubtitleStyleV2['background']>;
    transition?: Partial<SubtitleStyleV2['transition']>;
  },
): TemplateConfig {
  return {
    id,
    name,
    category,
    isNew,
    style: {
      ...DEFAULT_STYLE,
      ...overrides,
      font: { ...DEFAULT_STYLE.font, ...overrides.font },
      textColor: { ...DEFAULT_STYLE.textColor, ...overrides.textColor },
      stroke: { ...DEFAULT_STYLE.stroke, ...overrides.stroke },
      shadow: { ...DEFAULT_STYLE.shadow, ...overrides.shadow },
      background: { ...DEFAULT_STYLE.background, ...overrides.background },
      transition: { ...DEFAULT_STYLE.transition, ...overrides.transition },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {

  // ─── FEATURED ───────────────────────────────────────────────────────

  'kalakar-glow': tmpl('kalakar-glow', 'Kalakar Glow', 'featured', true, {
    font: { family: 'Montserrat', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 108,
    letterSpacing: -6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(250, 204, 21, 0.8)', blur: 72, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'kalakar-shadow': tmpl('kalakar-shadow', 'Kalakar Shadow', 'featured', true, {
    font: { family: 'Montserrat', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 108,
    letterSpacing: -6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 48, offsetX: 9, offsetY: 3 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'kalakar': tmpl('kalakar', 'Kalakar', 'featured', false, {
    font: { family: 'Inter', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 96,
    letterSpacing: -12,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.5)', blur: 12, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  // ─── CREATOR ────────────────────────────────────────────────────────

  'ali-abdaal': tmpl('ali-abdaal', 'Ali Abdaal', 'creator', false, {
    font: { family: 'Inter', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: -3,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.7,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'hormozi-style': tmpl('hormozi-style', 'Hormozi Style', 'creator', false, {
    font: { family: 'Oswald', weight: 800, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 120,
    letterSpacing: 6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 36, offsetX: 6, offsetY: 2 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'editing-skool': tmpl('editing-skool', 'Editing Skool', 'creator', false, {
    font: { family: 'Bebas Neue', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 144,
    letterSpacing: 9,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.4)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'scale',
    activeWordColor: '#FFFFFF',
    inactiveOpacity: 0.5,
    transition: { type: 'scale', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'mr-beast-style-1': tmpl('mr-beast-style-1', 'Mr Beast Style 1', 'creator', false, {
    font: { family: 'Montserrat', weight: 900, italic: false, underline: false, textTransform: 'none' },
    fontSize: 114,
    letterSpacing: -6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 24, offsetX: 9, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 4 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'mr-beast-style-2': tmpl('mr-beast-style-2', 'Mr Beast Style 2', 'creator', false, {
    font: { family: 'Montserrat', weight: 900, italic: false, underline: false, textTransform: 'none' },
    fontSize: 102,
    letterSpacing: -3,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.8)', blur: 30, offsetX: 6, offsetY: 2 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#ef4444',
    inactiveOpacity: 0.5,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'iman-gadzhi': tmpl('iman-gadzhi', 'Iman Gadzhi', 'creator', false, {
    font: { family: 'Poppins', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: -3,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'devin-jatho': tmpl('devin-jatho', 'Devin Jatho', 'creator', false, {
    font: { family: 'Oswald', weight: 600, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 126,
    letterSpacing: 6,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.8)', blur: 36, offsetX: 6, offsetY: 4 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#38bdf8',
    inactiveOpacity: 0.5,
    transition: { type: 'slide-up', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  // ─── MINIMAL ────────────────────────────────────────────────────────

  'clean-motion': tmpl('clean-motion', 'Clean Motion', 'minimal', false, {
    font: { family: 'Inter', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.2)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.7,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 30 },
  }),

  'clean-glow-style': tmpl('clean-glow-style', 'Clean Glow Style', 'minimal', false, {
    font: { family: 'Inter', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(255, 255, 255, 0.5)', blur: 48, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'kalakar-clean': tmpl('kalakar-clean', 'Kalakar Clean', 'minimal', false, {
    font: { family: 'Inter', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: -6,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.6)', blur: 24, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'kalakar-word': tmpl('kalakar-word', 'Kalakar Word', 'minimal', false, {
    font: { family: 'Inter', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: -6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'seedha-saadha': tmpl('seedha-saadha', 'Seedha Saadha', 'minimal', false, {
    font: { family: 'Roboto', weight: 700, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 90,
    letterSpacing: 3,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.7)', blur: 24, offsetX: 3, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'delhi': tmpl('delhi', 'Delhi', 'minimal', false, {
    font: { family: 'Poppins', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.7,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 30 },
  }),

  // ─── BOLD ───────────────────────────────────────────────────────────

  'double-trouble': tmpl('double-trouble', 'Double Trouble', 'bold', false, {
    font: { family: 'Montserrat', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 102,
    letterSpacing: -6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.4)', blur: 12, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'bubble-style': tmpl('bubble-style', 'Bubble Style', 'bold', false, {
    font: { family: 'Poppins', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#000000' },
    shadow: { color: 'rgba(0, 0, 0, 0)', blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(255, 255, 255, 0.95)', opacity: 0.95, paddingX: 48, paddingY: 30, borderRadius: 9999 },
    highlightMode: 'background',
    activeWordColor: '#000000',
    inactiveOpacity: 0.8,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'highlighted-word': tmpl('highlighted-word', 'Highlighted Word', 'bold', false, {
    font: { family: 'Inter', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 96,
    letterSpacing: -3,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'background',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'black-punch': tmpl('black-punch', 'Black Punch', 'bold', false, {
    font: { family: 'Oswald', weight: 700, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 108,
    letterSpacing: 6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 48, offsetX: 0, offsetY: 4 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(0, 0, 0, 0.85)', opacity: 0.85, paddingX: 48, paddingY: 24, borderRadius: 4 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'ziada': tmpl('ziada', 'Ziada', 'bold', false, {
    font: { family: 'Montserrat', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 108,
    letterSpacing: -6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.4)', blur: 12, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'top-up': tmpl('top-up', 'Top Up', 'bold', false, {
    font: { family: 'Montserrat', weight: 800, italic: false, underline: false, textTransform: 'none' },
    fontSize: 96,
    letterSpacing: -3,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.8)', blur: 30, offsetX: 6, offsetY: 2 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.5,
    transition: { type: 'slide-up', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'mota': tmpl('mota', 'Mota', 'bold', false, {
    font: { family: 'Oswald', weight: 800, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 132,
    letterSpacing: 9,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 36, offsetX: 9, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 4 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#ef4444',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 15 },
  }),

  'tabahi': tmpl('tabahi', 'Tabahi', 'bold', false, {
    font: { family: 'Montserrat', weight: 900, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 120,
    letterSpacing: 3,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 42, offsetX: 6, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#f97316',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  // ─── CINEMATIC ──────────────────────────────────────────────────────

  'pixelated-word': tmpl('pixelated-word', 'Pixelated Word', 'cinematic', false, {
    font: { family: 'Space Mono', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 78,
    letterSpacing: 6,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#22d3ee',
    inactiveOpacity: 0.5,
    transition: { type: 'fade', target: 'word', speedMode: 'fixed', speed: 40 },
  }),

  'liquid-glass': tmpl('liquid-glass', 'Liquid Glass', 'cinematic', false, {
    font: { family: 'Inter', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(255, 255, 255, 0.3)', blur: 60, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(255, 255, 255, 0.1)', opacity: 0.1, paddingX: 48, paddingY: 24, borderRadius: 12 },
    blur: 0,
    highlightMode: 'color',
    activeWordColor: '#FFFFFF',
    inactiveOpacity: 0.6,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'deep-glow': tmpl('deep-glow', 'Deep Glow', 'cinematic', false, {
    font: { family: 'Montserrat', weight: 800, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 114,
    letterSpacing: 3,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(139, 92, 246, 0.8)', blur: 84, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#a78bfa',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'thora-cinematic': tmpl('thora-cinematic', 'Thora Cinematic', 'cinematic', false, {
    font: { family: 'Playfair Display', weight: 700, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 102,
    letterSpacing: 12,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 1 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#fbbf24',
    inactiveOpacity: 0.5,
    transition: { type: 'fade', target: 'word', speedMode: 'fixed', speed: 35 },
  }),

  'zero-gravity': tmpl('zero-gravity', 'Zero Gravity', 'cinematic', false, {
    font: { family: 'Outfit', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: 3,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 12, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 1 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'scale',
    activeWordColor: '#FFFFFF',
    inactiveOpacity: 0.5,
    transition: { type: 'zoom', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  // ─── LIFESTYLE ──────────────────────────────────────────────────────

  'vlog-clean': tmpl('vlog-clean', 'Vlog Clean', 'lifestyle', true, {
    font: { family: 'Nunito', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.25)', blur: 18, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#f59e0b',
    inactiveOpacity: 0.65,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 28 },
  }),

  'travel-vibes': tmpl('travel-vibes', 'Travel Vibes', 'lifestyle', true, {
    font: { family: 'Quicksand', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: 3,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFBEB' },
    shadow: { color: 'rgba(234, 88, 12, 0.4)', blur: 36, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#f97316',
    inactiveOpacity: 0.55,
    transition: { type: 'slide-up', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'wellness': tmpl('wellness', 'Wellness', 'lifestyle', true, {
    font: { family: 'Comfortaa', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 78,
    letterSpacing: 3,
    lineSpacing: 1.5,
    textColor: { mode: 'solid', solid: '#F0FDF4' },
    shadow: { color: 'rgba(0, 0, 0, 0.15)', blur: 12, offsetX: 0, offsetY: 1 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#86efac',
    inactiveOpacity: 0.6,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 35 },
  }),

  'aesthetic': tmpl('aesthetic', 'Aesthetic', 'lifestyle', true, {
    font: { family: 'DM Sans', weight: 500, italic: false, underline: false, textTransform: 'none' },
    fontSize: 78,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#E2E8F0' },
    shadow: { color: 'rgba(0, 0, 0, 0.1)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(255, 255, 255, 0.08)', opacity: 0.08, paddingX: 42, paddingY: 24, borderRadius: 10 },
    highlightMode: 'color',
    activeWordColor: '#c4b5fd',
    inactiveOpacity: 0.55,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 30 },
  }),

  'storyteller': tmpl('storyteller', 'Storyteller', 'lifestyle', true, {
    font: { family: 'Lora', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FEF3C7' },
    shadow: { color: 'rgba(0, 0, 0, 0.5)', blur: 24, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#fbbf24',
    inactiveOpacity: 0.5,
    transition: { type: 'fade', target: 'word', speedMode: 'fixed', speed: 30 },
  }),

  'daily-vlog': tmpl('daily-vlog', 'Daily Vlog', 'lifestyle', true, {
    font: { family: 'Karla', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.4)', blur: 18, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  // ─── PROFESSIONAL ───────────────────────────────────────────────────

  'tutorial-clean': tmpl('tutorial-clean', 'Tutorial Clean', 'professional', true, {
    font: { family: 'Source Sans 3', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.2)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(0, 0, 0, 0.7)', opacity: 0.7, paddingX: 42, paddingY: 24, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#60a5fa',
    inactiveOpacity: 0.75,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'news-ticker': tmpl('news-ticker', 'News Ticker', 'professional', true, {
    font: { family: 'Barlow Condensed', weight: 700, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 90,
    letterSpacing: 6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(220, 38, 38, 0.9)', opacity: 0.9, paddingX: 48, paddingY: 24, borderRadius: 2 },
    highlightMode: 'none',
    activeWordColor: '#FFFFFF',
    inactiveOpacity: 1.0,
    transition: { type: 'slide-right', target: 'line', speedMode: 'dynamic', speed: 20 },
  }),

  'corporate': tmpl('corporate', 'Corporate', 'professional', true, {
    font: { family: 'IBM Plex Mono', weight: 500, italic: false, underline: false, textTransform: 'none' },
    fontSize: 72,
    letterSpacing: 3,
    lineSpacing: 1.5,
    textColor: { mode: 'solid', solid: '#F1F5F9' },
    shadow: { color: 'rgba(0, 0, 0, 0.15)', blur: 6, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#38bdf8',
    inactiveOpacity: 0.6,
    transition: { type: 'fade', target: 'word', speedMode: 'fixed', speed: 30 },
  }),

  'tech-startup': tmpl('tech-startup', 'Tech Startup', 'professional', true, {
    font: { family: 'Space Grotesk', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: -3,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.35)', blur: 18, offsetX: 0, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'scale',
    activeWordColor: '#818cf8',
    inactiveOpacity: 0.6,
    transition: { type: 'scale', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'podcast-style': tmpl('podcast-style', 'Podcast Style', 'professional', true, {
    font: { family: 'DM Sans', weight: 500, italic: false, underline: false, textTransform: 'none' },
    fontSize: 78,
    letterSpacing: 0,
    lineSpacing: 1.4,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.2)', blur: 9, offsetX: 0, offsetY: 1 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#a78bfa',
    inactiveOpacity: 0.65,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 30 },
  }),

  'presentation': tmpl('presentation', 'Presentation', 'professional', true, {
    font: { family: 'Outfit', weight: 600, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: 0,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 12, offsetX: 0, offsetY: 1 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.65,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  'finance-pro': tmpl('finance-pro', 'Finance Pro', 'professional', true, {
    font: { family: 'Oswald', weight: 600, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 90,
    letterSpacing: 6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.7)', blur: 30, offsetX: 3, offsetY: 2 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: true, color: 'rgba(0, 0, 0, 0.75)', opacity: 0.75, paddingX: 42, paddingY: 24, borderRadius: 4 },
    highlightMode: 'color',
    activeWordColor: '#4ade80',
    inactiveOpacity: 0.6,
    transition: { type: 'none', target: 'word', speedMode: 'dynamic', speed: 25 },
  }),

  // ─── VIRAL ──────────────────────────────────────────────────────────

  'viral-reels': tmpl('viral-reels', 'Viral Reels', 'viral', true, {
    font: { family: 'Montserrat', weight: 900, italic: false, underline: false, textTransform: 'none' },
    fontSize: 132,
    letterSpacing: -6,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 30, offsetX: 6, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 18 },
  }),

  'tiktok-energy': tmpl('tiktok-energy', 'TikTok Energy', 'viral', true, {
    font: { family: 'Anton', weight: 400, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 126,
    letterSpacing: 6,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 255, 136, 0.6)', blur: 60, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 3 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#00ff88',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 18 },
  }),

  'shorts-fire': tmpl('shorts-fire', 'Shorts Fire', 'viral', true, {
    font: { family: 'Bebas Neue', weight: 400, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 138,
    letterSpacing: 12,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.8)', blur: 24, offsetX: 6, offsetY: 2 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#f97316',
    inactiveOpacity: 0.45,
    transition: { type: 'slide-up', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'meme-lord': tmpl('meme-lord', 'Meme Lord', 'viral', true, {
    font: { family: 'Bangers', weight: 400, italic: false, underline: false, textTransform: 'none' },
    fontSize: 114,
    letterSpacing: 6,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.3)', blur: 0, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 4 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#facc15',
    inactiveOpacity: 0.6,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 20 },
  }),

  'street-style': tmpl('street-style', 'Street Style', 'viral', true, {
    font: { family: 'Bungee', weight: 400, italic: false, underline: false, textTransform: 'none' },
    fontSize: 102,
    letterSpacing: 3,
    lineSpacing: 1.1,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.8)', blur: 30, offsetX: 6, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#fb923c',
    inactiveOpacity: 0.4,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 18 },
  }),

  'neon-nights': tmpl('neon-nights', 'Neon Nights', 'viral', true, {
    font: { family: 'Orbitron', weight: 700, italic: false, underline: false, textTransform: 'none' },
    fontSize: 90,
    letterSpacing: 6,
    lineSpacing: 1.2,
    textColor: { mode: 'solid', solid: '#E0F2FE' },
    shadow: { color: 'rgba(139, 92, 246, 0.9)', blur: 90, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 1 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#22d3ee',
    inactiveOpacity: 0.4,
    transition: { type: 'fade', target: 'word', speedMode: 'dynamic', speed: 22 },
  }),

  'retro-vhs': tmpl('retro-vhs', 'Retro VHS', 'viral', true, {
    font: { family: 'Press Start 2P', weight: 400, italic: false, underline: false, textTransform: 'none' },
    fontSize: 60,
    letterSpacing: 6,
    lineSpacing: 1.6,
    textColor: { mode: 'solid', solid: '#00ff00' },
    shadow: { color: 'rgba(0, 255, 0, 0.4)', blur: 24, offsetX: 0, offsetY: 0 },
    stroke: { enabled: false, color: '#000000', width: 0 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#ffffff',
    inactiveOpacity: 0.5,
    transition: { type: 'fade', target: 'word', speedMode: 'fixed', speed: 35 },
  }),

  'gaming-hud': tmpl('gaming-hud', 'Gaming HUD', 'viral', true, {
    font: { family: 'Audiowide', weight: 400, italic: false, underline: false, textTransform: 'none' },
    fontSize: 84,
    letterSpacing: 6,
    lineSpacing: 1.3,
    textColor: { mode: 'solid', solid: '#E0F2FE' },
    shadow: { color: 'rgba(59, 130, 246, 0.6)', blur: 42, offsetX: 0, offsetY: 0 },
    stroke: { enabled: true, color: '#000000', width: 1 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'color',
    activeWordColor: '#3b82f6',
    inactiveOpacity: 0.5,
    transition: { type: 'slide-up', target: 'word', speedMode: 'dynamic', speed: 22 },
  }),

  'motivation-beast': tmpl('motivation-beast', 'Motivation Beast', 'viral', true, {
    font: { family: 'Teko', weight: 700, italic: false, underline: false, textTransform: 'uppercase' },
    fontSize: 144,
    letterSpacing: 9,
    lineSpacing: 1.0,
    textColor: { mode: 'solid', solid: '#FFFFFF' },
    shadow: { color: 'rgba(0, 0, 0, 0.9)', blur: 36, offsetX: 6, offsetY: 3 },
    stroke: { enabled: true, color: '#000000', width: 4 },
    background: { enabled: false, color: 'rgba(0,0,0,0)', opacity: 0, paddingX: 36, paddingY: 18, borderRadius: 6 },
    highlightMode: 'karaoke',
    activeWordColor: '#ef4444',
    inactiveOpacity: 0.35,
    transition: { type: 'pop', target: 'word', speedMode: 'dynamic', speed: 15 },
  }),
};

// ═══════════════════════════════════════════════════════════════════════
// REGISTRY API
// ═══════════════════════════════════════════════════════════════════════

export function getTemplateById(id: string): TemplateConfig | undefined {
  return TEMPLATE_REGISTRY[id];
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY).filter(t => t.category === category);
}

export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export function getTemplateCategories(): TemplateCategory[] {
  return ['featured', 'creator', 'minimal', 'bold', 'cinematic', 'lifestyle', 'professional', 'viral'];
}

export const TEMPLATE_COUNT = Object.keys(TEMPLATE_REGISTRY).length;
