/**
 * SRT / VTT Export Utilities
 *
 * Converts editor segments into industry-standard subtitle formats.
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

// ─── SRT ─────────────────────────────────────────────────────────────────────

/**
 * Generate an SRT (SubRip Subtitle) file string from editor segments.
 * SRT is the most universally compatible subtitle format.
 */
export function segmentsToSrt(segments: Segment[]): string {
  if (!segments || segments.length === 0) return '';

  return segments
    .filter((s) => s.text.trim().length > 0)
    .map((seg, idx) => {
      const startTime = toSrtTime(seg.start);
      const endTime = toSrtTime(Math.max(seg.start + 0.05, seg.end));
      const text = seg.text.trim();
      return `${idx + 1}\n${startTime} --> ${endTime}\n${text}`;
    })
    .join('\n\n');
}

// ─── VTT ─────────────────────────────────────────────────────────────────────

/**
 * Generate a WebVTT file string from editor segments.
 * VTT is the modern web-native subtitle format (HTML5 video, YouTube).
 */
export function segmentsToVtt(segments: Segment[]): string {
  if (!segments || segments.length === 0) return 'WEBVTT\n\n';

  const cues = segments
    .filter((s) => s.text.trim().length > 0)
    .map((seg, idx) => {
      const startTime = toVttTime(seg.start);
      const endTime = toVttTime(Math.max(seg.start + 0.05, seg.end));
      const text = seg.text.trim();
      return `${idx + 1}\n${startTime} --> ${endTime}\n${text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${cues}`;
}

// ─── Download Helper ──────────────────────────────────────────────────────────

/**
 * Trigger a browser file download with the given content.
 */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export segments as .srt and trigger download.
 */
export function exportSrt(segments: Segment[], projectTitle?: string): void {
  const content = segmentsToSrt(segments);
  const filename = `${(projectTitle || 'captions').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.srt`;
  downloadTextFile(content, filename, 'text/plain');
}

/**
 * Export segments as .vtt and trigger download.
 */
export function exportVtt(segments: Segment[], projectTitle?: string): void {
  const content = segmentsToVtt(segments);
  const filename = `${(projectTitle || 'captions').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.vtt`;
  downloadTextFile(content, filename, 'text/vtt');
}

/**
 * Export segments as plain text transcript and trigger download.
 */
export function exportTranscript(segments: Segment[], projectTitle?: string): void {
  const content = segments
    .filter((s) => s.text.trim().length > 0)
    .map((s) => s.text.trim())
    .join('\n');
  const filename = `${(projectTitle || 'transcript').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  downloadTextFile(content, filename, 'text/plain');
}
