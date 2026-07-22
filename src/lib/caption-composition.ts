import { Word, Segment } from '@/store/editor-store';
import { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';

// ─── Models ─────────────────────────────────────────────────────────────

export interface LayoutContext {
  containerWidth: number;
  containerHeight: number;
  safeArea: number; // e.g. padding from edges
  devicePixelRatio: number;
  scaleFactor: number;
  aspectRatio: number;
  exportMode: boolean;
  measureWord?: (word: string) => number; // Interface for measurement dependency injection
}

export interface Line {
  id: string;
  width: number;
  height: number;
  baseline: number;
  isBalanced: boolean;
  manualBreak: boolean;
  locked: boolean; // Phase 6: True if line boundaries were manually forced
  words: Word[];
  // Phase 4 Metadata
  measuredWidth: number;
  availableWidth: number;
  fillRatio: number;
  constraintReason?: string;
  // Phase 5 Metadata
  balanceScore: number;
  penalties: {
    orphan: number;
    raggedness: number;
    overflow: number;
  };
}


export type ManualConstraint = 
  | "lineBreak" 
  | "blockBreak" 
  | "keepTogether" 
  | "keepApart" 
  | "pinLine" 
  | "excludeBalancing";

export interface ManualOverride {
  layoutProfileId: string;   // preset + aspect ratio + layout profile
  type: ManualConstraint;
  beforeWordId: string;
}

export type SplitReason = 'punctuation' | 'pause' | 'preset' | 'manual' | 'geometry' | 'none';

export interface CaptionBlock {
  id: string;
  start: number;
  end: number;
  duration: number;
  confidence: number;
  compositionStrategy: string;
  splitReason: SplitReason;
  manualOverride: boolean;
  layoutVersion: number;
  lines: Line[];
  // Phase 7: Reading Speed Metadata
  readingSpeed?: {
    requiredMs: number;
    actualMs: number;
    deficitMs: number;
    severity: 'ok' | 'mild' | 'moderate' | 'severe';
  };
}

export interface CompositionDiagnostics {
  composeTimeMs: number;
  measureTimeMs: number;
  phraseDetectionMs: number;
  timingSegmentationMs: number;
  geometryMs: number;
  visualBalanceMs: number;
  readingSpeedMs: number;
  validationMs: number;
  cacheHits: number;
  cacheMisses: number;
  totalWords: number;
  measuredWords: number;
  layoutVersion: number;
  preset: string;
}

export interface CompositionParameters {
  maxWordsPerLine: number;
  maxLinesPerBlock: number;
  maxCharactersPerLine: number;
  minimumDurationMs: number;
  msPerCharacter: number;
  maxExtensionMs: number;
  allowBackwardExtension: boolean;
  allowForwardExtension: boolean;
  pauseThresholdMs: number;
  safeAreaWidthRatio: number;
  preferredFillRatio: number;
  minimumFillRatio: number;
  preferredShape: 'balanced' | 'bottomHeavy' | 'centered' | 'cinematic';
}

export interface CompositionPreset {
  id: string;
  displayName: string;
  description: string;
  category: 'social' | 'video' | 'podcast' | 'cinematic';
  recommendedFor: string[];
  experimental: boolean;
  version: number;
  parameters: CompositionParameters;
}

export class CompositionPresetValidator {
  static validate(preset: CompositionPreset): boolean {
    const p = preset.parameters;
    const errors: string[] = [];

    if (p.maxLinesPerBlock < 1) errors.push('maxLinesPerBlock must be >= 1');
    if (p.maxWordsPerLine < 1) errors.push('maxWordsPerLine must be >= 1');
    if (p.safeAreaWidthRatio > 1.0 || p.safeAreaWidthRatio <= 0) errors.push('safeAreaWidthRatio must be > 0 and <= 1.0');
    if (p.minimumFillRatio > p.preferredFillRatio) errors.push('minimumFillRatio cannot exceed preferredFillRatio');
    if (p.pauseThresholdMs < 0) errors.push('pauseThresholdMs cannot be negative');

    if (errors.length > 0) {
      console.error(`Preset Validation Failed for ${preset.id}:`, errors);
      return false;
    }
    return true;
  }
}

// ─── Presets ────────────────────────────────────────────────────────────

export const COMPOSITION_PRESETS: Record<string, CompositionPreset> = {
  social_reels: {
    id: 'social_reels',
    displayName: 'Social Reels',
    description: 'Aggressive chunking, extremely bottom-heavy, fast cuts. Best for high-energy shorts.',
    category: 'social',
    recommendedFor: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    experimental: false,
    version: 1,
    parameters: {
      maxWordsPerLine: 3,
      maxLinesPerBlock: 2,
      maxCharactersPerLine: 20,
      minimumDurationMs: 400,
      msPerCharacter: 40,
      maxExtensionMs: 500,
      allowBackwardExtension: false,
      allowForwardExtension: true,
      pauseThresholdMs: 250,
      safeAreaWidthRatio: 0.85,
      preferredFillRatio: 0.8,
      minimumFillRatio: 0.4,
      preferredShape: 'bottomHeavy',
    }
  },
  standard: {
    id: 'standard',
    displayName: 'Standard Video',
    description: 'Balanced readability and moderate density. Ideal for traditional horizontal video.',
    category: 'video',
    recommendedFor: ['YouTube Vlogs', 'Educational'],
    experimental: false,
    version: 1,
    parameters: {
      maxWordsPerLine: 6,
      maxLinesPerBlock: 2,
      maxCharactersPerLine: 34,
      minimumDurationMs: 400,
      msPerCharacter: 40,
      maxExtensionMs: 500,
      allowBackwardExtension: false,
      allowForwardExtension: true,
      pauseThresholdMs: 400,
      safeAreaWidthRatio: 0.85,
      preferredFillRatio: 0.8,
      minimumFillRatio: 0.4,
      preferredShape: 'balanced',
    }
  },
  podcast: {
    id: 'podcast',
    displayName: 'Podcast',
    description: 'Dense, readable blocks to minimize flashing during long-form conversational content.',
    category: 'podcast',
    recommendedFor: ['Video Podcasts', 'Interviews'],
    experimental: false,
    version: 1,
    parameters: {
      maxWordsPerLine: 8,
      maxLinesPerBlock: 3,
      maxCharactersPerLine: 42,
      minimumDurationMs: 500,
      msPerCharacter: 40,
      maxExtensionMs: 500,
      allowBackwardExtension: false,
      allowForwardExtension: true,
      pauseThresholdMs: 600,
      safeAreaWidthRatio: 0.85,
      preferredFillRatio: 0.8,
      minimumFillRatio: 0.4,
      preferredShape: 'bottomHeavy',
    }
  },
  movie: {
    id: 'movie',
    displayName: 'Cinematic',
    description: 'Wide, centered lines. Traditional closed-captioning aesthetic for documentary or film.',
    category: 'cinematic',
    recommendedFor: ['Documentaries', 'Short Films'],
    experimental: false,
    version: 1,
    parameters: {
      maxWordsPerLine: 12,
      maxLinesPerBlock: 2,
      maxCharactersPerLine: 50,
      minimumDurationMs: 600,
      msPerCharacter: 40,
      maxExtensionMs: 500,
      allowBackwardExtension: false,
      allowForwardExtension: true,
      pauseThresholdMs: 500,
      safeAreaWidthRatio: 0.85,
      preferredFillRatio: 0.8,
      minimumFillRatio: 0.4,
      preferredShape: 'cinematic',
    }
  }
};


// ─── Phase 3: Intelligence Stages ───────────────────────────────────────

interface WordGroup {
  words: Word[];
  splitReason: SplitReason;
  confidence: number;
}

export class PhraseDetector {
  private static readonly END_PUNCTUATION = new Set(['.', '!', '?']);
  private static readonly WEAK_PUNCTUATION = new Set([',', ';']);
  private static readonly CONJUNCTIONS = new Set(['and', 'but', 'because', 'or', 'so', 'yet']);

  static detect(words: Word[], preset: CompositionPreset, blockBreaks: Set<string>, keepTogether: Set<string>): WordGroup[] {
    if (words.length === 0) return [];
    
    const maxWords = preset.parameters.maxWordsPerLine * preset.parameters.maxLinesPerBlock;
    const groups: WordGroup[] = [];
    let currentGroup: Word[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const cleanWord = w.word.trim().toLowerCase();
      currentGroup.push(w);
      
      const lastChar = cleanWord.slice(-1);
      const isEndPunct = this.END_PUNCTUATION.has(lastChar);
      const isWeakPunct = this.WEAK_PUNCTUATION.has(lastChar);
      
      const nextWord = i < words.length - 1 ? words[i+1].word.trim().toLowerCase() : null;
      const isNextConjunction = nextWord ? this.CONJUNCTIONS.has(nextWord) : false;
      
      const hitMaxLength = currentGroup.length >= maxWords;
      
      let shouldSplit = false;
      let reason: SplitReason = 'none';
      let confidence = 1.0;
      
      // 1. Manual Constraints
      const isNextManualBreak = nextWord && blockBreaks.has(words[i+1].id);
      const isNextKeepTogether = nextWord && keepTogether.has(words[i+1].id);

      if (isNextManualBreak) {
        shouldSplit = true;
        reason = 'manual';
        confidence = 1.0;
      } 
      // 2. Automated Constraints (only if not forced to keep together)
      else if (!isNextKeepTogether) {
        if (isEndPunct) {
          shouldSplit = true;
          reason = 'punctuation';
        } else if (isWeakPunct || isNextConjunction) {
          shouldSplit = true;
          reason = 'punctuation';
          confidence = 0.8;
        } else if (hitMaxLength) {
          shouldSplit = true;
          reason = 'preset';
          confidence = 0.6;
        }
        
        // Orphan prevention: don't split if only 1 word remains in the segment
        if (shouldSplit && i === words.length - 2) {
          shouldSplit = false;
        }
      }
      
      if (shouldSplit || i === words.length - 1) {
        groups.push({
          words: [...currentGroup],
          splitReason: reason,
          confidence
        });
        currentGroup = [];
      }
    }
    
    return groups;
  }
}

export class TimingSegmenter {
  static segment(phraseGroups: WordGroup[], preset: CompositionPreset): WordGroup[] {
    const finalGroups: WordGroup[] = [];
    const threshold = preset.parameters.pauseThresholdMs / 1000.0;
    
    for (const group of phraseGroups) {
      const words = group.words;
      if (words.length <= 1) {
        finalGroups.push(group);
        continue;
      }
      
      let currentSubGroup: Word[] = [];
      let splitReason = group.splitReason;
      
      for (let i = 0; i < words.length; i++) {
        currentSubGroup.push(words[i]);
        
        let shouldSplit = false;
        if (i < words.length - 1) {
          const gap = words[i+1].start - words[i].end;
          if (gap > threshold) {
            shouldSplit = true;
          }
        }
        
        // Orphan prevention
        if (shouldSplit && i === words.length - 2 && words.length > 2) {
            // Re-evaluate: if it's a huge pause, maybe we still split. 
            // For now, let's keep it simple: don't orphan the last word of a grammatical phrase.
            shouldSplit = false;
        }
        
        if (shouldSplit) {
          finalGroups.push({
            words: [...currentSubGroup],
            splitReason: 'pause',
            confidence: 0.9
          });
          currentSubGroup = [];
        } else if (i === words.length - 1) {
          finalGroups.push({
            words: [...currentSubGroup],
            splitReason: splitReason, // inherit the grammar reason for the last part
            confidence: group.confidence
          });
        }
      }
    }
    
    return finalGroups;
  }
}



export class GeometrySolver {
  static solve(
    blockId: string,
    words: Word[],
    preset: CompositionPreset,
    context: LayoutContext,
    measureWord: (word: string) => number,
    lineBreaks: Set<string>,
    targetLineCount?: number
  ): Line[] {
    const availableWidth = context.containerWidth * preset.parameters.safeAreaWidthRatio;
    const maxWords = preset.parameters.maxWordsPerLine;
    const maxChars = preset.parameters.maxCharactersPerLine;
    
    const lines: Line[] = [];
    let currentLineWords: Word[] = [];
    let currentLineWidth = 0;
    
    // Evaluate candidates greedily for now, structured as a constraint solver
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wordText = w.word.trim();
      const wordWidth = measureWord(wordText);
      const spaceWidth = currentLineWords.length > 0 ? measureWord(' ') : 0;
      
      const candidateWidth = currentLineWidth + spaceWidth + wordWidth;
      const candidateCount = currentLineWords.length + 1;
      const candidateChars = currentLineWords.reduce((acc, curr) => acc + curr.word.trim().length + 1, 0) + wordText.length;
      
      let commitLine = false;
      let constraintReason = 'none';

      // 0. Manual Override
      if (lineBreaks.has(w.id) && currentLineWords.length > 0) {
        commitLine = true;
        constraintReason = 'manual';
      }
      // 1. Width Constraint
      else if (candidateWidth > availableWidth && currentLineWords.length > 0) {
        commitLine = true;
        constraintReason = 'width_overflow';
      }
      // 2. Word Count Constraint
      else if (candidateCount > maxWords && currentLineWords.length > 0) {
        commitLine = true;
        constraintReason = 'max_words';
      }
      // 3. Character Constraint
      else if (candidateChars > maxChars && currentLineWords.length > 0) {
        commitLine = true;
        constraintReason = 'max_chars';
      }

      if (commitLine) {
        // Commit current line
        lines.push(this.createLine(blockId, lines.length, currentLineWords, currentLineWidth, availableWidth, constraintReason));
        
        // Start new line with current word
        currentLineWords = [w];
        currentLineWidth = wordWidth;
      } else {
        // Accept candidate
        currentLineWords.push(w);
        currentLineWidth = candidateWidth;
      }
    }
    
    // Commit remaining words
    if (currentLineWords.length > 0) {
      lines.push(this.createLine(blockId, lines.length, currentLineWords, currentLineWidth, availableWidth, 'end_of_block'));
    }
    
    // Validation Pass
    this.validate(words, lines);
    
    return lines;
  }

  private static createLine(blockId: string, index: number, words: Word[], measuredWidth: number, availableWidth: number, reason: string): Line {
    const hasManualBreak = reason === 'manual';
    return {
      id: `line-${blockId}-${index}`,
      width: measuredWidth,
      height: 0,
      baseline: 0,
      isBalanced: false,
      manualBreak: hasManualBreak,
      locked: hasManualBreak,
      words: [...words],
      measuredWidth: measuredWidth,
      availableWidth: availableWidth,
      fillRatio: measuredWidth / availableWidth,
      constraintReason: reason,
      balanceScore: 0,
      penalties: { orphan: 0, raggedness: 0, overflow: 0 }
    };
  }

  private static validate(sourceWords: Word[], lines: Line[]) {
    let wordCount = 0;
    for (const line of lines) {
      if (line.words.length === 0) {
        console.error(`Geometry Validation Error: Empty line detected in ${line.id}`);
      }
      wordCount += line.words.length;
    }
    if (wordCount !== sourceWords.length) {
      console.error(`Geometry Validation Error: Word count mismatch. Source: ${sourceWords.length}, Output: ${wordCount}`);
    }
  }
}


export interface BalanceResult {
  success: boolean;
  reason?: string;
  suggestedLineCount?: number;
  lines: Line[];
  // Phase 7: Reading Speed Metadata
  readingSpeed?: {
    requiredMs: number;
    actualMs: number;
    deficitMs: number;
    severity: 'ok' | 'mild' | 'moderate' | 'severe';
  };
}

export class VisualBalancer {
  static balance(
    blockId: string,
    words: Word[],
    baseLines: Line[],
    preset: CompositionPreset,
    context: LayoutContext,
    measureWord: (word: string) => number
  ): BalanceResult {
    const lineCount = baseLines.length;
    
    // If any line is manually locked, we skip automated visual balancing for the whole block
    const isLocked = baseLines.some(l => l.locked);

    if (lineCount <= 1 || words.length <= 1 || isLocked) {
      // Nothing to balance, or we are not allowed to balance. Just score and return.
      const scored = this.scoreLayout(baseLines, preset);
      return { success: true, lines: scored.lines };
    }

    const availableWidth = context.containerWidth * preset.parameters.safeAreaWidthRatio;
    
    // Generate all valid partitions of words into `lineCount` lines
    const partitions = this.generatePartitions(words, lineCount);
    
    let bestScore = -Infinity;
    let bestLines: Line[] = baseLines; // fallback to base

    for (const partition of partitions) {
      // Build candidate lines
      const candidateLines: Line[] = [];
      let isValid = true;
      
      for (let i = 0; i < partition.length; i++) {
        const lineWords = partition[i];
        if (lineWords.length === 0) {
          isValid = false;
          break; // Empty lines are invalid
        }
        
        // Check hard constraints: max words/chars
        if (lineWords.length > preset.parameters.maxWordsPerLine) isValid = false;
        const charCount = lineWords.reduce((acc, w) => acc + w.word.trim().length, 0);
        if (charCount > preset.parameters.maxCharactersPerLine) isValid = false;
        
        let lineWidth = 0;
        for (let j = 0; j < lineWords.length; j++) {
           lineWidth += measureWord(lineWords[j].word.trim());
           if (j > 0) lineWidth += measureWord(' ');
        }
        
        candidateLines.push({
          id: `line-${blockId}-${i}`,
          width: lineWidth,
          height: 0,
          baseline: 0,
          isBalanced: true,
          manualBreak: false,
          locked: false,
          words: lineWords,
          measuredWidth: lineWidth,
          availableWidth: availableWidth,
          fillRatio: lineWidth / availableWidth,
          constraintReason: 'balanced',
          balanceScore: 0,
          penalties: { orphan: 0, raggedness: 0, overflow: 0 }
        });
      }
      
      if (!isValid) continue;
      
      const scored = this.scoreLayout(candidateLines, preset);
      
      // We strongly penalize overflows. If it overflows, score will be highly negative.
      if (scored.score > bestScore) {
        bestScore = scored.score;
        bestLines = scored.lines;
      }
    }

    // Evaluate if the best score is still unacceptable (e.g. massive overflow)
    // If bestScore is heavily negative, we might need a reflow
    if (bestScore < -1000) {
      return {
        success: false,
        reason: 'needs_reflow',
        suggestedLineCount: lineCount + 1,
        lines: bestLines // return best effort
      };
    }

    // Validation pass
    this.validate(words, bestLines);

    return { success: true, lines: bestLines };
  }

  private static scoreLayout(lines: Line[], preset: CompositionPreset): { score: number, lines: Line[] } {
    let overflowPenalty = 0;
    let orphanPenalty = 0;
    let raggednessPenalty = 0;

    for (const line of lines) {
      if (line.fillRatio > 1.0) {
        overflowPenalty += (line.fillRatio - 1.0) * 10000; // Hard constraint heavily penalized
      }
    }

    const lastLine = lines[lines.length - 1];
    if (lastLine.fillRatio < preset.parameters.minimumFillRatio) {
      orphanPenalty = (preset.parameters.minimumFillRatio - lastLine.fillRatio) * 1000;
    }

    if (lines.length > 1) {
      for (let i = 0; i < lines.length - 1; i++) {
        const current = lines[i];
        const next = lines[i+1];
        
        if (preset.parameters.preferredShape === 'bottomHeavy') {
          if (current.fillRatio > next.fillRatio) {
            raggednessPenalty += (current.fillRatio - next.fillRatio) * 500;
          }
        } else if (preset.parameters.preferredShape === 'balanced') {
          raggednessPenalty += Math.abs(current.fillRatio - next.fillRatio) * 500;
        } else if (preset.parameters.preferredShape === 'cinematic') {
          // Typically very wide, single line preferred, but if 2, keep them long
          raggednessPenalty += Math.abs(current.fillRatio - next.fillRatio) * 200;
        }
      }
    }

    const totalScore = -(overflowPenalty + orphanPenalty + raggednessPenalty);
    
    // Apply score to lines for metadata
    const scoredLines = lines.map(l => ({
      ...l,
      balanceScore: totalScore,
      penalties: { orphan: orphanPenalty, raggedness: raggednessPenalty, overflow: overflowPenalty }
    }));

    return { score: totalScore, lines: scoredLines };
  }

  private static generatePartitions(words: Word[], k: number): Word[][][] {
    // Generate all ways to partition `words` into `k` non-empty contiguous subarrays
    if (k === 1) return [[words]];
    if (words.length < k) return [];
    
    const results: Word[][][] = [];
    
    // Recursively partition
    for (let i = 1; i <= words.length - k + 1; i++) {
      const firstPart = words.slice(0, i);
      const remainder = words.slice(i);
      const subPartitions = this.generatePartitions(remainder, k - 1);
      
      for (const sub of subPartitions) {
        results.push([firstPart, ...sub]);
      }
    }
    
    return results;
  }

  private static validate(sourceWords: Word[], lines: Line[]) {
    let wordCount = 0;
    for (const line of lines) {
      if (line.words.length === 0) {
        console.error(`Balancer Validation Error: Empty line detected`);
      }
      wordCount += line.words.length;
    }
    if (wordCount !== sourceWords.length) {
      console.error(`Balancer Validation Error: Word count mismatch.`);
    }
  }
}


export class ReadingSpeedOptimizer {
  static optimize(blocks: CaptionBlock[], preset: CompositionPreset) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const prevBlockEnd = i > 0 ? blocks[i - 1].end : -Infinity;
      const nextBlockStart = i < blocks.length - 1 ? blocks[i + 1].start : Infinity;
      
      const charCount = block.lines.reduce((acc, line) => acc + line.words.reduce((sum, w) => sum + w.word.trim().length, 0), 0);
      
      // Dynamic reading target
      const requiredDuration = Math.max(
        preset.parameters.minimumDurationMs / 1000.0,
        (charCount * preset.parameters.msPerCharacter) / 1000.0
      );
      
      let actualDuration = block.end - block.start;
      
      // Attempt Forward Extension
      if (actualDuration < requiredDuration && preset.parameters.allowForwardExtension) {
        const allowedExtension = Math.min(
          preset.parameters.maxExtensionMs / 1000.0,
          nextBlockStart - block.end
        );
        
        if (allowedExtension > 0) {
          const extensionNeeded = requiredDuration - actualDuration;
          const extensionApplied = Math.min(extensionNeeded, allowedExtension);
          block.end += extensionApplied;
          actualDuration = block.end - block.start;
        }
      }
      
      // Attempt Backward Extension (if still needed)
      if (actualDuration < requiredDuration && preset.parameters.allowBackwardExtension) {
        const allowedExtension = Math.min(
          preset.parameters.maxExtensionMs / 1000.0,
          block.start - prevBlockEnd
        );
        
        if (allowedExtension > 0) {
          const extensionNeeded = requiredDuration - actualDuration;
          const extensionApplied = Math.min(extensionNeeded, allowedExtension);
          block.start -= extensionApplied;
          actualDuration = block.end - block.start;
        }
      }
      
      block.duration = actualDuration;
      
      const deficit = requiredDuration - actualDuration;
      
      let severity: 'ok' | 'mild' | 'moderate' | 'severe' = 'ok';
      if (deficit > 0.5) severity = 'severe';
      else if (deficit > 0.2) severity = 'moderate';
      else if (deficit > 0) severity = 'mild';
      
      block.readingSpeed = {
        requiredMs: requiredDuration * 1000,
        actualMs: actualDuration * 1000,
        deficitMs: Math.max(0, deficit * 1000),
        severity
      };
    }
    
    this.validate(blocks);
  }
  
  private static validate(blocks: CaptionBlock[]) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.end < block.start) {
        console.error(`ReadingSpeed Validation Error: Block ${block.id} has end time < start time`);
      }
      if (i < blocks.length - 1 && block.end > blocks[i+1].start) {
         console.error(`ReadingSpeed Validation Error: Overlap detected between block ${block.id} and ${blocks[i+1].id}`);
      }
    }
  }
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class CaptionCompositionEngine {
  private layoutVersion = 1;
  private segmentCache = new Map<string, CaptionBlock[]>();
  
  public diagnostics = {
    measureTimeMs: 0,
    phraseDetectionMs: 0,
    timingSegmentationMs: 0,
    geometryMs: 0,
    visualBalanceMs: 0,
    readingSpeedMs: 0,
    validationMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  private resetDiagnostics() {
    this.diagnostics = {
      measureTimeMs: 0,
      phraseDetectionMs: 0,
      timingSegmentationMs: 0,
      geometryMs: 0,
      visualBalanceMs: 0,
      readingSpeedMs: 0,
      validationMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
  
  private hashStyle(style: SubtitleStyleV3): string {
    return `${style.font.family}-${style.font.weight}-${style.fontSize}-${style.letterSpacing}`;
  }

  private hashSegment(segment: Segment, presetVersion: number, layoutProfileId: string, styleHash: string, overrides: ManualOverride[]): string {
    const text = segment.words.map((w: any) => w.word).join(' ');
    const times = segment.words.map((w: any) => `${w.start}-${w.end}`).join(',');
    const overridesStr = overrides.filter(o => segment.words.some((w: any) => w.id === o.beforeWordId)).map(o => `${o.type}:${o.beforeWordId}`).join(',');
    return `${segment.id}|${text}|${times}|${presetVersion}|${layoutProfileId}|${styleHash}|${overridesStr}`;
  }

  public compose(
    segments: Segment[], 
    style: SubtitleStyleV3, 
    context: LayoutContext,
    presetId: string = 'social_reels',
    overrides: ManualOverride[] = []
  ): CaptionBlock[] {
    const preset = COMPOSITION_PRESETS[presetId] || COMPOSITION_PRESETS['social_reels'];
    const generatedBlocks: CaptionBlock[] = [];
    
    // Quick lookup sets for overrides
    const blockBreaks = new Set(overrides.filter(o => o.type === 'blockBreak').map(o => o.beforeWordId));
    const lineBreaks = new Set(overrides.filter(o => o.type === 'lineBreak').map(o => o.beforeWordId));
    const keepTogether = new Set(overrides.filter(o => o.type === 'keepTogether').map(o => o.beforeWordId));

    this.resetDiagnostics();
    const styleHash = this.hashStyle(style);
    const layoutProfileId = `${presetId}-${context.aspectRatio}`;

    // Process each Segment independently
    for (const segment of segments) {
      if (!segment.words || segment.words.length === 0) continue;
      
      const cacheKey = this.hashSegment(segment, preset.version, layoutProfileId, styleHash, overrides);
      if (this.segmentCache.has(cacheKey)) {
        this.diagnostics.cacheHits++;
        
        // Deep clone the cached blocks because later passes (lifecycle, reading speed) modify their boundaries!
        const cachedBlocks = JSON.parse(JSON.stringify(this.segmentCache.get(cacheKey)!));
        generatedBlocks.push(...cachedBlocks);
        continue;
      }
      
      this.diagnostics.cacheMisses++;
      const segmentBlocks: CaptionBlock[] = [];

      // 1. Phrase Detection (Grammar)
      const tP = performance.now();
      const phraseGroups = PhraseDetector.detect(segment.words, preset, blockBreaks, keepTogether);
      this.diagnostics.phraseDetectionMs += performance.now() - tP;
      
      // 2. Timing Segmentation (Rhythm)
      const tT = performance.now();
      const timedGroups = TimingSegmenter.segment(phraseGroups, preset);
      this.diagnostics.timingSegmentationMs += performance.now() - tT;

      // 3. Block Generation & Geometry
      for (let i = 0; i < timedGroups.length; i++) {
        const group = timedGroups[i];
        if (group.words.length === 0) continue;
        
        const firstWord = group.words[0];
        const lastWord = group.words[group.words.length - 1];
        
        const blockId = `block-${segment.id}-${i}`;
        
        // Use injected measurement function or fallback to simple char count estimation for safety if missing
        let mTime = 0;
        const measureWord = (text: string) => {
           const mt0 = performance.now();
           const res = context.measureWord ? context.measureWord(text) : text.length * 15;
           mTime += performance.now() - mt0;
           return res;
        };
        
        const tG = performance.now();
        let lines = GeometrySolver.solve(blockId, group.words, preset, context, measureWord, lineBreaks);
        this.diagnostics.geometryMs += (performance.now() - tG) - mTime;
        
        // 3b. Visual Balance
        const tV = performance.now();
        let balanceResult = VisualBalancer.balance(blockId, group.words, lines, preset, context, measureWord);
        
        if (!balanceResult.success && balanceResult.reason === 'needs_reflow' && balanceResult.suggestedLineCount) {
           lines = balanceResult.lines;
        } else {
           lines = balanceResult.lines;
        }
        this.diagnostics.visualBalanceMs += (performance.now() - tV) - mTime;
        this.diagnostics.measureTimeMs += mTime;

        segmentBlocks.push({
          id: blockId,
          start: firstWord.start,
          end: lastWord.end, // temporary end, clamped in post-pass
          duration: 0,
          confidence: group.confidence,
          compositionStrategy: presetId,
          splitReason: group.splitReason,
          manualOverride: group.splitReason === 'manual' || lines.some(l => l.locked),
          layoutVersion: this.layoutVersion,
          lines: lines
        });
      }
      
      this.segmentCache.set(cacheKey, segmentBlocks);
      
      // Push cloned blocks so modifications don't corrupt the cache
      generatedBlocks.push(...JSON.parse(JSON.stringify(segmentBlocks)));
    }

    // 4. Block Lifecycle (Visibility & Clamping)
    for (let i = 0; i < generatedBlocks.length; i++) {
      const block = generatedBlocks[i];
      const lastWord = block.lines[block.lines.length - 1].words.slice(-1)[0];
      
      const nextBlockStart = i < generatedBlocks.length - 1 
        ? generatedBlocks[i + 1].start 
        : Infinity;
        
      const holdTime = lastWord.end + (0.150); // Hardcoded 150ms hold padding since ReadingSpeedOptimizer now handles duration extension
      
      block.end = Math.min(holdTime, nextBlockStart);
      
      if (block.end < lastWord.end) {
        block.end = lastWord.end; // clamp to not disappear before speaking ends
      }
      
      block.duration = block.end - block.start;
    }

    // 5. Reading Speed Optimization
    const tR = performance.now();
    ReadingSpeedOptimizer.optimize(generatedBlocks, preset);
    this.diagnostics.readingSpeedMs += performance.now() - tR;

    // 6. Final Validation Pass
    const tV = performance.now();
    this.validate(segments, generatedBlocks);
    this.diagnostics.validationMs += performance.now() - tV;

    return generatedBlocks;
  }

  private validate(sourceSegments: Segment[], generatedBlocks: CaptionBlock[]) {
    // Collect all source words sequentially
    const sourceWords: Word[] = [];
    for (const seg of sourceSegments) {
      sourceWords.push(...seg.words);
    }
    
    // Collect all generated words sequentially
    const genWords: Word[] = [];
    for (const block of generatedBlocks) {
      if (block.end < block.start) {
        console.error(`Validation Error: Block ${block.id} has end time < start time`);
      }
      for (const line of block.lines) {
        genWords.push(...line.words);
      }
    }
    
    if (sourceWords.length !== genWords.length) {
      console.error(`Validation Error: Word count mismatch! Source: ${sourceWords.length}, Output: ${genWords.length}`);
    }
    
    for (let i = 0; i < Math.min(sourceWords.length, genWords.length); i++) {
      if (sourceWords[i].id !== genWords[i].id) {
        console.error(`Validation Error: Word mismatch at index ${i}. Expected ${sourceWords[i].word}, got ${genWords[i].word}`);
        break; // Only log first failure to avoid console spam
      }
    }
  }

}

export const compositionEngine = new CaptionCompositionEngine();
