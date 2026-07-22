import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';

export interface ExportInputProps {
  projectId: string;
  videoUrl: string;
  fps: number;
  durationInFrames: number;
  dimensions: { width: number; height: number };
  segments: Segment[];
  subtitleStyle: SubtitleStyleV3;
  subtitleMode: 'original' | 'transliterated' | 'translated';
}
