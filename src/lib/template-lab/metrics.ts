/**
 * TEMPLATE LAB — Metrics & Layout
 * Development-only layout utilities for static archetypes.
 */

import type { AspectRatio } from './types';

// Safe zone margins to avoid platform UI (TikTok, Reels, Shorts)
// Typically, bottom 20% is dangerous, right 15% is dangerous.
export const SAFE_ZONE_PERCENTAGES = {
  top: 0.1,    // 10% from top
  bottom: 0.2, // 20% from bottom (UI icons, captions)
  left: 0.05,  // 5% from left
  right: 0.15, // 15% from right (like, share, comment buttons)
};

/**
 * Returns the absolute pixel boundaries of the safe area.
 */
export function getSafeBounds(w: number, h: number, aspectRatio: AspectRatio) {
  const isVertical = aspectRatio === '9:16';
  
  // Apply platform UI avoidance mainly on 9:16 vertical video
  const topM = isVertical ? h * SAFE_ZONE_PERCENTAGES.top : h * 0.05;
  const bottomM = isVertical ? h * SAFE_ZONE_PERCENTAGES.bottom : h * 0.05;
  const leftM = w * SAFE_ZONE_PERCENTAGES.left;
  const rightM = isVertical ? w * SAFE_ZONE_PERCENTAGES.right : w * 0.05;

  return {
    top: topM,
    bottom: h - bottomM,
    left: leftM,
    right: w - rightM,
    width: w - leftM - rightM,
    height: h - topM - bottomM,
  };
}

/**
 * Scales typography based on the smaller dimension to prevent
 * massive fonts on 16:9 or 1:1 layouts.
 */
export function scaleTypography(baseSizePx: number, w: number, h: number): number {
  // Assume base design was done for 1080x1920 (width = 1080)
  const minDim = Math.min(w, h);
  const ratio = minDim / 1080;
  return baseSizePx * ratio;
}

export type PositionAnchor = 'upper' | 'centre' | 'lower';

/**
 * Returns the absolute Y coordinate for a given position preset.
 * This Y is typically the center of the text block.
 */
export function getAnchorY(position: PositionAnchor, bounds: ReturnType<typeof getSafeBounds>): number {
  const { top, bottom, height } = bounds;
  switch (position) {
    case 'upper': return top + height * 0.15;
    case 'centre': return top + height * 0.5;
    case 'lower': return bottom - height * 0.15;
  }
}

/**
 * Deterministic canvas scaling helper.
 */
export function scaleCanvasUnit(px: number, canvasWidth: number): number {
  return (px / 1080) * canvasWidth;
}
