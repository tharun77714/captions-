/**
 * TEMPLATE LAB — Core Types
 * Development-only. Not imported by any production code.
 */

import { PositionAnchor } from './metrics';

export type AspectRatio = '9:16' | '1:1' | '16:9';
export type LabLanguage = 'english' | 'telugu' | 'mixed';
export type BackgroundType = 'dark' | 'light' | 'colorful' | 'video';
export type StoryboardState = 'entry' | 'active' | 'completed' | 'stress';

export interface LabWord {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface LabSegment {
  words: LabWord[];
  language: LabLanguage;
  secondaryWords?: LabWord[];
  secondaryLanguage?: LabLanguage;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface GroupedWords {
  sourceWords: LabWord[];
  visibleWords: LabWord[];
  previousWords: LabWord[];
  activeWord: LabWord | null;
  upcomingWords: LabWord[];
  hiddenByStoryboardState: LabWord[];
  activeSourceIndex: number;
}

export interface TemplateRenderProps {
  // The primary grouped words (pre-processed based on storyboard state)
  grouped: GroupedWords;
  
  canvas: CanvasSize;
  aspectRatio: AspectRatio;
  language: LabLanguage;
  
  storyboardState: StoryboardState;
  position: PositionAnchor;
  
  // Secondary language lane (if applicable)
  secondaryGrouped?: GroupedWords;
  secondaryLanguage?: LabLanguage;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  tagline: string;
  palette: string[];
  description: string;
}

export interface TemplateDefinition {
  meta: TemplateMetadata;
  Component: React.ComponentType<TemplateRenderProps>;
}
