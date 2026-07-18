/**
 * TRANSITION ENGINE — Shared computation for Preview + Export
 *
 * Both the CSS preview renderer (video-player.tsx) and the new export
 * renderer consume TransitionConfig from the schema.
 * This module computes the transition parameters that both renderers use.
 *
 * The engine does NOT render — it computes timing and delta values.
 * Rendering is the responsibility of each renderer.
 */

import type { TransitionConfig, TransitionType } from './subtitle-schema-v2';

// ═══════════════════════════════════════════════════════════════════════
// DURATION COMPUTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute transition duration in milliseconds.
 *
 * Dynamic: duration = word duration (end - start)
 * Fixed:   duration = (50 - speed) * 10ms
 *          speed=0 → 500ms, speed=25 → 250ms, speed=50 → 0ms
 */
export function computeDurationMs(
  config: TransitionConfig,
  wordStart: number,
  wordEnd: number
): number {
  if (config.type === 'none') return 0;

  if (config.speedMode === 'dynamic') {
    return Math.max(50, (wordEnd - wordStart) * 1000);
  }

  // Fixed mode
  return Math.max(0, (50 - config.speed) * 10);
}

// ═══════════════════════════════════════════════════════════════════════
// CSS PREVIEW PARAMETERS
// ═══════════════════════════════════════════════════════════════════════

export interface CSSTransitionParams {
  /** CSS property to transition, e.g. 'opacity', 'transform', 'all' */
  property: string;
  /** Duration in ms */
  durationMs: number;
  /** CSS easing function */
  easing: string;
  /** Initial CSS styles (before transition) */
  initialStyle: React.CSSProperties;
  /** Active CSS styles (after transition) */
  activeStyle: React.CSSProperties;
}

/**
 * Compute CSS transition parameters for the preview renderer.
 * Returns the styles to apply to a word span when it becomes active.
 */
export function getCSSTransitionParams(
  type: TransitionType,
  durationMs: number,
): CSSTransitionParams {
  const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const dur = durationMs;

  switch (type) {
    case 'none':
      return {
        property: 'none',
        durationMs: 0,
        easing: ease,
        initialStyle: {},
        activeStyle: {},
      };

    case 'fade':
      return {
        property: 'opacity',
        durationMs: dur,
        easing: ease,
        initialStyle: { opacity: 0 },
        activeStyle: { opacity: 1 },
      };

    case 'pop':
      return {
        property: 'transform',
        durationMs: dur,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // overshoot
        initialStyle: { transform: 'scale(0)' },
        activeStyle: { transform: 'scale(1)' },
      };

    case 'scale':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'scale(1)' },
        activeStyle: { transform: 'scale(1.15)' },
      };

    case 'slide-left':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'translateX(-20px)', opacity: 0 },
        activeStyle: { transform: 'translateX(0)', opacity: 1 },
      };

    case 'slide-right':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'translateX(20px)', opacity: 0 },
        activeStyle: { transform: 'translateX(0)', opacity: 1 },
      };

    case 'slide-up':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'translateY(-20px)', opacity: 0 },
        activeStyle: { transform: 'translateY(0)', opacity: 1 },
      };

    case 'slide-down':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'translateY(20px)', opacity: 0 },
        activeStyle: { transform: 'translateY(0)', opacity: 1 },
      };

    case 'zoom':
      return {
        property: 'all',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'scale(0.5)', opacity: 0 },
        activeStyle: { transform: 'scale(1)', opacity: 1 },
      };

    case 'flip-x':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'perspective(400px) rotateX(90deg)', opacity: 0 },
        activeStyle: { transform: 'perspective(400px) rotateX(0deg)', opacity: 1 },
      };

    case 'flip-y':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'perspective(400px) rotateY(90deg)', opacity: 0 },
        activeStyle: { transform: 'perspective(400px) rotateY(0deg)', opacity: 1 },
      };

    case 'spin':
      return {
        property: 'transform',
        durationMs: dur,
        easing: ease,
        initialStyle: { transform: 'rotate(180deg) scale(0)', opacity: 0 },
        activeStyle: { transform: 'rotate(0deg) scale(1)', opacity: 1 },
      };

    case 'blur':
      return {
        property: 'filter, opacity',
        durationMs: dur,
        easing: ease,
        initialStyle: { filter: 'blur(10px)', opacity: 0 },
        activeStyle: { filter: 'blur(0px)', opacity: 1 },
      };

    case 'bounce':
      return {
        property: 'transform',
        durationMs: dur,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Custom bounce easing
        initialStyle: { transform: 'translateY(30px) scale(0.8)', opacity: 0 },
        activeStyle: { transform: 'translateY(0) scale(1)', opacity: 1 },
      };

    case 'elastic':
      return {
        property: 'transform',
        durationMs: dur,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Elastic pop
        initialStyle: { transform: 'scaleX(1.5) scaleY(0.5)', opacity: 0 },
        activeStyle: { transform: 'scaleX(1) scaleY(1)', opacity: 1 },
      };
  }
}


