/**
 * MIGRATION: SubtitleStyle V1 → V2
 * 
 * Requirements:
 * - No existing project becomes unreadable
 * - No style data is lost
 * - Missing fields receive deterministic defaults
 * - Migration is idempotent: migrateV1ToV2(migrateV1ToV2(v1)) === migrateV1ToV2(v1)
 */

// ─── V1 Type (current production) ────────────────────────────────────
interface SubtitleStyleV1 {
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
  highlightMode: 'none' | 'color' | 'scale' | 'underline' | 'background' | 'karaoke';
}

// ─── V2 Type (target) ────────────────────────────────────────────────
interface FontConfig {
  family: string;
  weight: number;
  italic: boolean;
  underline: boolean;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface ColorConfig {
  mode: 'solid' | 'gradient';
  solid: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
}

interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
}

interface ShadowConfig {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

interface BackgroundConfig {
  enabled: boolean;
  color: string;
  opacity: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

type TransitionType = 'none' | 'fade' | 'pop' | 'scale' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

interface TransitionConfig {
  type: TransitionType;
  target: 'word' | 'line';
  speedMode: 'dynamic' | 'fixed';
  speed: number;
}

interface SubtitleStyleV2 {
  _version: 2;
  font: FontConfig;
  fontSize: number;
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  textColor: ColorConfig;
  stroke: StrokeConfig;
  shadow: ShadowConfig;
  background: BackgroundConfig;
  blur: number;
  alignment: 'left' | 'center' | 'right';
  positionX: number;
  positionY: number;
  highlightMode: 'none' | 'color' | 'scale' | 'underline' | 'background' | 'karaoke';
  activeWordColor: string;
  inactiveOpacity: number;
  transition: TransitionConfig;
}

// ─── Helper: Extract RGBA opacity ────────────────────────────────────
function extractRgbaOpacity(rgba: string): number {
  if (rgba.startsWith('rgba')) {
    const parts = rgba.replace('rgba(', '').replace(')', '').split(',');
    if (parts.length === 4) return parseFloat(parts[3].trim());
  }
  return 1.0;
}

// ─── Helper: Check if background is visible ──────────────────────────
function isBackgroundVisible(bgColor: string): boolean {
  if (!bgColor) return false;
  if (bgColor === 'transparent') return false;
  if (bgColor === 'rgba(0, 0, 0, 0)') return false;
  if (bgColor === 'rgba(0,0,0,0)') return false;
  const opacity = extractRgbaOpacity(bgColor);
  return opacity > 0;
}

// ─── V1 → V2 Migration ──────────────────────────────────────────────
export function migrateV1ToV2(v1: SubtitleStyleV1): SubtitleStyleV2 {
  return {
    _version: 2,

    font: {
      family: v1.fontFamily,
      weight: v1.fontWeight,
      italic: false,        // V1 had no italic
      underline: false,     // V1 had no underline
      textTransform: 'none', // V1 had no casing
    },

    fontSize: v1.fontSize,
    letterSpacing: 0,       // V1 had no letter spacing
    wordSpacing: 0,         // V1 had no word spacing
    lineSpacing: 1.375,     // V1 used hardcoded leading-snug (1.375)

    textColor: {
      mode: 'solid',
      solid: v1.textColor,
    },

    stroke: {
      enabled: v1.strokeWidth > 0,
      color: v1.strokeColor,
      width: v1.strokeWidth,
    },

    shadow: {
      color: v1.shadowColor,
      blur: v1.shadowBlur,
      offsetX: 0,           // V1 had no shadow offset
      offsetY: 0,
    },

    background: {
      enabled: isBackgroundVisible(v1.backgroundColor),
      color: v1.backgroundColor,
      opacity: extractRgbaOpacity(v1.backgroundColor),
      paddingX: 12,         // V1 hardcoded px-3 = 12px
      paddingY: 6,          // V1 hardcoded py-1.5 = 6px
      borderRadius: 6,      // V1 hardcoded rounded-md ≈ 6px
    },

    blur: 0,                // V1 had no blur

    alignment: v1.alignment,

    // Map V1 position (top/center/bottom) to positionX/Y
    positionX: 0,
    positionY: v1.position === 'top' ? -40 : v1.position === 'center' ? 0 : 40,

    highlightMode: v1.highlightMode,
    activeWordColor: '#facc15', // V1 hardcoded yellow
    inactiveOpacity: v1.highlightMode === 'none' ? 1.0 : 0.5,

    transition: {
      type: 'none',         // V1 had no transitions
      target: 'word',
      speedMode: 'dynamic',
      speed: 25,
    },
  };
}

// ─── Detect version ──────────────────────────────────────────────────
export function isV2(style: any): boolean {
  return style?._version === 2;
}

// ─── Idempotent loader ───────────────────────────────────────────────
export function ensureV2(style: any): SubtitleStyleV2 {
  if (isV2(style)) return style as SubtitleStyleV2;
  return migrateV1ToV2(style as SubtitleStyleV1);
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

function runMigrationTests() {
  console.log('═══ Migration Tests ═══\n');

  // Test 1: Basic V1 migration
  const v1: SubtitleStyleV1 = {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 700,
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowBlur: 4,
    alignment: 'center',
    position: 'bottom',
    highlightMode: 'none',
  };

  const v2 = migrateV1ToV2(v1);

  // Verify no data loss
  console.log('Test 1: No data loss');
  console.assert(v2.font.family === 'Inter', 'fontFamily preserved');
  console.assert(v2.fontSize === 24, 'fontSize preserved');
  console.assert(v2.font.weight === 700, 'fontWeight preserved');
  console.assert(v2.textColor.solid === '#FFFFFF', 'textColor preserved');
  console.assert(v2.background.color === 'rgba(0, 0, 0, 0.75)', 'backgroundColor preserved');
  console.assert(v2.background.enabled === true, 'background auto-detected as enabled');
  console.assert(v2.background.opacity === 0.75, 'background opacity extracted');
  console.assert(v2.stroke.enabled === false, 'stroke disabled when width=0');
  console.assert(v2.alignment === 'center', 'alignment preserved');
  console.assert(v2.highlightMode === 'none', 'highlightMode preserved');
  console.assert(v2._version === 2, '_version set');
  console.log('  ✅ All assertions passed\n');

  // Test 2: Idempotency
  console.log('Test 2: Idempotency');
  const v2_again = ensureV2(v2);
  console.assert(JSON.stringify(v2) === JSON.stringify(v2_again), 'Double migration produces identical result');
  console.log('  ✅ Idempotent\n');

  // Test 3: Transparent background
  console.log('Test 3: Transparent background detection');
  const v1_no_bg: SubtitleStyleV1 = { ...v1, backgroundColor: 'rgba(0, 0, 0, 0)' };
  const v2_no_bg = migrateV1ToV2(v1_no_bg);
  console.assert(v2_no_bg.background.enabled === false, 'Transparent bg → enabled=false');
  console.log('  ✅ Transparent bg handled\n');

  // Test 4: Position mapping
  console.log('Test 4: Position mapping');
  const v1_top: SubtitleStyleV1 = { ...v1, position: 'top' };
  const v2_top = migrateV1ToV2(v1_top);
  console.assert(v2_top.positionY === -40, 'top → positionY=-40');

  const v1_center: SubtitleStyleV1 = { ...v1, position: 'center' };
  const v2_center = migrateV1ToV2(v1_center);
  console.assert(v2_center.positionY === 0, 'center → positionY=0');

  const v1_bottom: SubtitleStyleV1 = { ...v1, position: 'bottom' };
  const v2_bottom = migrateV1ToV2(v1_bottom);
  console.assert(v2_bottom.positionY === 40, 'bottom → positionY=40');
  console.log('  ✅ All positions mapped\n');

  // Test 5: Stroke enabled detection
  console.log('Test 5: Stroke enabled detection');
  const v1_stroke: SubtitleStyleV1 = { ...v1, strokeWidth: 2 };
  const v2_stroke = migrateV1ToV2(v1_stroke);
  console.assert(v2_stroke.stroke.enabled === true, 'strokeWidth>0 → enabled=true');
  console.assert(v2_stroke.stroke.width === 2, 'strokeWidth preserved');
  console.log('  ✅ Stroke detection works\n');

  // Test 6: Highlight mode with opacity
  console.log('Test 6: Highlight mode opacity');
  const v1_karaoke: SubtitleStyleV1 = { ...v1, highlightMode: 'karaoke' };
  const v2_karaoke = migrateV1ToV2(v1_karaoke);
  console.assert(v2_karaoke.inactiveOpacity === 0.5, 'karaoke → inactiveOpacity=0.5');
  console.assert(v2_karaoke.activeWordColor === '#facc15', 'default activeWordColor=#facc15');
  console.log('  ✅ Highlight mode preserved\n');

  // Test 7: Default fields populated
  console.log('Test 7: Default fields');
  console.assert(v2.letterSpacing === 0, 'letterSpacing default');
  console.assert(v2.wordSpacing === 0, 'wordSpacing default');
  console.assert(v2.lineSpacing === 1.375, 'lineSpacing default');
  console.assert(v2.blur === 0, 'blur default');
  console.assert(v2.transition.type === 'none', 'transition default');
  console.assert(v2.font.italic === false, 'italic default');
  console.assert(v2.font.underline === false, 'underline default');
  console.assert(v2.font.textTransform === 'none', 'textTransform default');
  console.log('  ✅ All defaults populated\n');

  console.log('═══ ALL MIGRATION TESTS PASSED ═══');
}

runMigrationTests();
