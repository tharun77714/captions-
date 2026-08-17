/**
 * SRT / VTT Export and Import Utilities
 *
 * Converts editor segments to/from industry-standard subtitle formats (SRT, VTT).
 * Zero external dependencies — pure frontend, works offline.
 */

import type { Segment } from '@/store/editor-store';

// ─── Formatters ──────────────────────────────────────────────────────────────

function toSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function toVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// ─── Shared Helpers ────────────────────────────────────────────────────────

export function normalizeUnicodeText(str: string): string {
  if (!str) return '';
  return str.normalize('NFC').trim();
}

type SegmenterType = new (
  locales?: string | string[],
  options?: Record<string, unknown>
) => {
  segment: (input: string) => Iterable<{ segment: string; isWordLike: boolean }>;
};

/**
 * Shared subtitle tokenization helper used across SRT/VTT import, synthetic word generation,
 * and transcript hydration validation.
 * Supports Intl.Segmenter with approved space fallback.
 * Preserves punctuation attached to display words (e.g. "Hello, world!" -> ["Hello,", "world!"]).
 */
export function tokenizeSubtitleText(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\r?\n/g, ' ').trim();
  if (!clean) return [];

  const intlObj = Intl as unknown as { Segmenter?: SegmenterType };
  if (typeof Intl !== 'undefined' && intlObj.Segmenter) {
    try {
      const segmenter = new intlObj.Segmenter(undefined, { granularity: 'word' });
      const segments = Array.from(segmenter.segment(clean));
      const tokens: string[] = [];
      let currentToken = '';

      for (const seg of segments) {
        if (seg.isWordLike) {
          if (currentToken) {
            tokens.push(currentToken.trim());
          }
          currentToken = seg.segment;
        } else if (/\s/.test(seg.segment)) {
          if (currentToken) {
            tokens.push(currentToken.trim());
            currentToken = '';
          }
        } else {
          currentToken += seg.segment;
        }
      }
      if (currentToken) tokens.push(currentToken.trim());
      const filtered = tokens.filter((t) => t.length > 0);
      if (filtered.length > 0) return filtered;
    } catch {
      // Fallback to space split below
    }
  }

  return clean.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Distributes word timestamps evenly across a cue boundary.
 * Every word satisfies start < end, synthetic timingSource, mode-namespaced deterministic IDs, and ends at cue.end.
 */
export function distributeSyntheticWords(
  text: string,
  start: number,
  end: number,
  segId: number | string,
  mode: string = 'original'
): Array<{ id: string; word: string; start: number; end: number; timingSource: 'synthetic' }> {
  const tokens = tokenizeSubtitleText(text);
  if (tokens.length === 0) return [];

  const duration = Math.max(0.0001, end - start);
  const step = duration / tokens.length;

  const modePrefix = mode ? `${mode}-` : '';

  return tokens.map((token, i) => {
    const wordStart = i === 0 ? start : start + i * step;
    const wordEnd = i === tokens.length - 1 ? end : start + (i + 1) * step;

    const clampedStart = Math.max(start, wordStart);
    let clampedEnd = i === tokens.length - 1 ? end : Math.min(end, wordEnd);

    if (clampedEnd <= clampedStart) {
      clampedEnd = clampedStart + 0.00005;
    }

    return {
      id: `w-${modePrefix}seg-${segId}-${i}`,
      word: token,
      start: Number(clampedStart.toFixed(5)),
      end: Number(clampedEnd.toFixed(5)),
      timingSource: 'synthetic' as const,
    };
  });
}

export interface ParsedCue {
  start: number;
  end: number;
  text: string;
}

export interface OverlapReport {
  index1: number;
  index2: number;
  cue1: ParsedCue;
  cue2: ParsedCue;
}

/**
 * Detect overlapping cues where cue[i+1].start < cue[i].end.
 */
export function findOverlappingCues(cues: ParsedCue[]): OverlapReport[] {
  const overlaps: OverlapReport[] = [];
  for (let i = 0; i < cues.length - 1; i++) {
    const current = cues[i];
    const next = cues[i + 1];
    if (next.start < current.end) {
      overlaps.push({
        index1: i + 1,
        index2: i + 2,
        cue1: current,
        cue2: next,
      });
    }
  }
  return overlaps;
}

/**
 * Auto-resolves overlapping cues by capping cue[i].end at cue[i+1].start.
 */
export function autoFixOverlaps(cues: ParsedCue[]): ParsedCue[] {
  if (cues.length <= 1) return cues;
  const fixed: ParsedCue[] = [];

  for (let i = 0; i < cues.length; i++) {
    const current = { ...cues[i] };
    if (i < cues.length - 1) {
      const next = cues[i + 1];
      if (current.end > next.start) {
        current.end = Math.max(current.start + 0.05, next.start);
      }
    }
    fixed.push(current);
  }

  return fixed;
}

// ─── Strict Timestamp Parsers ────────────────────────────────────────────────

export function parseTimestampToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const raw = timeStr.trim();

  const fullMatch = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(raw);
  if (fullMatch) {
    const h = parseInt(fullMatch[1], 10);
    const m = parseInt(fullMatch[2], 10);
    const s = parseInt(fullMatch[3], 10);
    const ms = parseInt(fullMatch[4], 10);
    return h * 3600 + m * 60 + s + ms / 1000;
  }

  const shortMatch = /^(\d{2}):(\d{2})[,.](\d{3})$/.exec(raw);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const s = parseInt(shortMatch[2], 10);
    const ms = parseInt(shortMatch[3], 10);
    return m * 60 + s + ms / 1000;
  }

  return null;
}

// ─── Subtitle Parsers ───────────────────────────────────────────────────────

export function parseSrt(srtContent: string): ParsedCue[] {
  if (!srtContent) return [];
  const cleanContent = srtContent.replace(/^\uFEFF/, '');
  const blocks = cleanContent.trim().split(/\n\s*\n/);
  const cues: ParsedCue[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const times = timeLine.split('-->').map((t) => t.trim());
    if (times.length !== 2) continue;

    const start = parseTimestampToSeconds(times[0]);
    const end = parseTimestampToSeconds(times[1]);

    if (start === null || end === null || start >= end) continue;

    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();

    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}

export function parseVtt(vttContent: string): ParsedCue[] {
  if (!vttContent) return [];
  const cleanContent = vttContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/);

  let headerEnded = false;
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!headerEnded) {
      if (trimmed.toUpperCase().startsWith('WEBVTT')) continue;
      if (trimmed === '') {
        headerEnded = true;
        continue;
      }
    }

    if (trimmed === '') {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(trimmed);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const cues: ParsedCue[] = [];

  for (const block of blocks) {
    const timeLineIdx = block.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = block[timeLineIdx];
    const parts = timeLine.split('-->').map((p) => p.trim());
    if (parts.length !== 2) continue;

    const start = parseTimestampToSeconds(parts[0]);
    const endPart = parts[1].split(/\s+/)[0];
    const end = parseTimestampToSeconds(endPart);

    if (start === null || end === null || start >= end) continue;

    const textLines = block.slice(timeLineIdx + 1);
    const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();

    if (text) {
      cues.push({ start, end, text });
    }
  }

  return cues;
}

// ─── Generators ─────────────────────────────────────────────────────────────

export function segmentsToSrt(segments: Segment[]): string {
  if (!segments || segments.length === 0) return '';
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  return sorted
    .map((seg, idx) => {
      const index = idx + 1;
      const start = toSrtTime(seg.start);
      const end = toSrtTime(seg.end);
      const text = seg.text || seg.words.map((w) => w.word).join(' ');
      return `${index}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n');
}

export function segmentsToVtt(segments: Segment[]): string {
  if (!segments || segments.length === 0) return 'WEBVTT\n\n';
  const sorted = [...segments].sort((a, b) => a.start - b.start);

  const cuesStr = sorted
    .map((seg, idx) => {
      const index = idx + 1;
      const start = toVttTime(seg.start);
      const end = toVttTime(seg.end);
      const text = seg.text || seg.words.map((w) => w.word).join(' ');
      return `${index}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${cuesStr}`;
}

export function exportSrt(segments: Segment[]): string {
  return segmentsToSrt(segments);
}

export function exportVtt(segments: Segment[]): string {
  return segmentsToVtt(segments);
}

export function exportTranscript(segments: Segment[]): string {
  if (!segments || segments.length === 0) return '';
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  return sorted.map((s) => s.text || s.words.map((w) => w.word).join(' ')).join('\n');
}
