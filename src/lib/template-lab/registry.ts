/**
 * TEMPLATE LAB — Registry
 *
 * Includes standard prototypes and HyperFrames Cinematic Archetypes.
 */

import type { TemplateDefinition } from './types';
import HyperFramesEmbeddedClimax from '@/components/template-lab/prototypes/HyperFramesEmbeddedClimax';
import HyperFramesCreatorRail from '@/components/template-lab/prototypes/HyperFramesCreatorRail';
import HyperFramesEditorialPremium from '@/components/template-lab/prototypes/HyperFramesEditorialPremium';
import ViralPunchPro from '@/components/template-lab/prototypes/ViralPunchPro';
import PodcastPro from '@/components/template-lab/prototypes/PodcastPro';
import BilingualIndiaPro from '@/components/template-lab/prototypes/BilingualIndiaPro';

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    meta: {
      id: 'hyperframes-climax',
      name: 'HyperFrames 3D Climax',
      tagline: 'Hero Climax Behind Creator',
      description: 'Cinematic 3D depth layer with hero punchline behind creator and synchronized lower rail.',
      palette: ['#FACC15', '#FFFFFF', '#000000'], // gold, white, black
    },
    Component: HyperFramesEmbeddedClimax,
  },
  {
    meta: {
      id: 'hyperframes-rail',
      name: 'HyperFrames Creator Rail',
      tagline: 'Glassmorphism Kinetic Rail',
      description: 'Clean lower-third rail with word-by-word kinetic glow and safe area bounds.',
      palette: ['#FFFFFF', '#A1A1AA', '#71717A'], // white, zinc
    },
    Component: HyperFramesCreatorRail,
  },
  {
    meta: {
      id: 'hyperframes-editorial',
      name: 'HyperFrames Editorial',
      tagline: 'Scene-Aware Contrast Serif',
      description: 'Sophisticated serif styling with dynamic scene luminance adaptation and cyan glow.',
      palette: ['#38BDF8', '#FFFFFF', '#0A0A0C'], // sky, white, dark
    },
    Component: HyperFramesEditorialPremium,
  },
  {
    meta: {
      id: 'viral-punch-pro',
      name: 'Viral Punch Pro',
      tagline: 'High-energy 1-word scaling',
      description: 'Optimized for TikTok/Reels short hooks.',
      palette: ['#EAEAEA', '#FACC15', '#22C55E', '#EF4444'], // white, yellow, green, red
    },
    Component: ViralPunchPro,
  },
  {
    meta: {
      id: 'podcast-pro',
      name: 'Podcast Pro',
      tagline: 'Clean 3-word bursts',
      description: 'Elegant B2B and educational style.',
      palette: ['#FFFFFF', '#38BDF8', '#818CF8'], // white, sky, indigo
    },
    Component: PodcastPro,
  },
  {
    meta: {
      id: 'bilingual-india-pro',
      name: 'Bilingual India Pro',
      tagline: 'Telugu + Romanized English',
      description: 'Dual-lane localized setup for Indian creators.',
      palette: ['#FFFFFF', '#F97316', '#3B82F6'], // white, orange, blue
    },
    Component: BilingualIndiaPro,
  },
];
