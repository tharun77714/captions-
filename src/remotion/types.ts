import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import type { CaptionBlock } from '@/lib/caption-composition';

export interface ExportInputProps {
  projectId: string;
  videoUrl: string;
  fps: number;
  durationInFrames: number;
  dimensions: { width: number; height: number };
  segments: Segment[];
  subtitleStyle: SubtitleStyleV3;
  subtitleMode: 'original' | 'transliterated' | 'translated';
  useCompositionRenderer: boolean;
  computedBlocks?: CaptionBlock[];
}
