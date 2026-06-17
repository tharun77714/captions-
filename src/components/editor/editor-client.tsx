'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore, Segment, Word, SubtitleStyle } from '@/store/editor-store';
import { resolveWordStyle } from '@/lib/subtitle-schema-v3';
import { VideoPlayer, VideoPlayerRef } from '@/components/editor/video-player';
import { TranscriptPanel } from '@/components/editor/transcript-panel';
import { StylePanel } from '@/components/editor/style-panel';
import { Timeline } from '@/components/editor/timeline';
import { Loader2, ArrowLeft, Undo2, Redo2, Download, Video } from 'lucide-react';
import Link from 'next/link';
import { ensureV3, getAllUsedFonts } from '@/lib/subtitle-schema-v3';
import { preloadFonts } from '@/lib/font-registry';
import { ExportModal, ExportOptions } from '@/components/editor/export-modal';
import { motion } from 'framer-motion';

interface EditorClientProps {
  project: {
    id: string;
    title: string;
    media_url: string;
    status: string;
    subtitle_style?: SubtitleStyle | null;
  };
  transcription: {
    language: string;
    segments: Segment[];
    words: Word[];
    transliteratedSegments?: Segment[] | null;
    transliteratedWords?: Word[] | null;
    translatedSegments?: Segment[] | null;
    translatedWords?: Word[] | null;
    waveform?: number[];
  };
}

export type ExportStatus = 'none' | 'exporting' | 'completed' | 'failed';

export function EditorClient({ project, transcription }: EditorClientProps) {
  const {
    segments,
    originalSegments,
    transliteratedSegments,
    translatedSegments,
    subtitleMode,
    setSubtitleMode,
    subtitleStyle,
    setProjectData,
    setVideoUrl,
    setTranscriptData,
    setSubtitleStyle,
    undo,
    redo,
    canUndo,
    canRedo,
    currentTime,
    splitSegment,
    mergeSegments,
    timelineZoom,
    setTimelineZoom,
    setEditMode,
    validateTimingModel,
    waveform,
    setWaveform,
    videoUrl,
  } = useEditorStore();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<ExportStatus>('none');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Initialize store with server data
  useEffect(() => {
    setProjectData({
      projectId: project.id,
      projectTitle: project.title,
      language: transcription.language,
    });
    setTranscriptData(
      transcription.segments,
      transcription.words,
      transcription.transliteratedSegments || undefined,
      transcription.transliteratedWords || undefined,
      transcription.translatedSegments || undefined,
      transcription.translatedWords || undefined
    );
    if (project.subtitle_style) {
      setSubtitleStyle(ensureV3(project.subtitle_style));
    }
  }, [project, transcription, setProjectData, setTranscriptData, setSubtitleStyle]);

  // Dynamic Font Loading
  useEffect(() => {
    if (subtitleStyle) {
      const fonts = getAllUsedFonts(subtitleStyle);
      preloadFonts(fonts).catch(err => console.error('Failed to preload fonts:', err));
    }
  }, [subtitleStyle]);

  const handleSave = React.useCallback(async (): Promise<boolean> => {
    setSaveStatus('saving');
    try {
      // Phase 2.5: Strict validation before saving
      const validation = validateTimingModel();
      if (!validation.isValid) {
        console.error('Save aborted due to timing validation failure:', validation.errors);
        alert('Cannot save: Timing model corrupted.\n\n' + validation.errors.join('\n'));
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

      // Get all arrays from store state to ensure we save backing arrays
      const state = useEditorStore.getState();

      const getBackingUpdates = (mode: string, currentSegs: Segment[]) => {
        const updates: { original?: Segment[], transliterated?: Segment[], translated?: Segment[] } = {};
        if (mode === 'original') updates.original = currentSegs;
        else if (mode === 'transliterated') updates.transliterated = currentSegs;
        else if (mode === 'translated') updates.translated = currentSegs;
        return updates;
      };

      const backing = getBackingUpdates(state.subtitleMode, state.segments);
      const finalOriginal = backing.original || state.originalSegments;
      const finalTranslit = backing.transliterated || state.transliteratedSegments;
      const finalTranslated = backing.translated || state.translatedSegments;

      const flatOriginalWords = finalOriginal.flatMap(s => s.words);
      const flatTranslitWords = finalTranslit.flatMap(s => s.words);
      const flatTranslatedWords = finalTranslated.flatMap(s => s.words);

      const res = await fetch(`/api/transcriptions/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: finalOriginal,
          words: flatOriginalWords,
          transliteratedSegments: finalTranslit,
          transliteratedWords: flatTranslitWords,
          translatedSegments: finalTranslated,
          translatedWords: flatTranslatedWords,
          subtitleStyle,
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return true;
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return false;
    }
  }, [project.id, subtitleStyle, validateTimingModel]);

  const handleExport = async (options: ExportOptions) => {
    if (exportStatus === 'exporting') return;
    
    // Save first
    const saved = await handleSave();
    if (!saved) {
      alert("Failed to save project. Export aborted.");
      return;
    }

    setExportStatus('exporting');
    try {
      // Capture actual rendered measurements from the browser DOM
      const measurements = videoPlayerRef.current?.getRenderedMeasurements();
      const state = useEditorStore.getState();
      const resolvedStyles: Record<string, ReturnType<typeof resolveWordStyle>> = {};
      state.segments.forEach(seg => {
        seg.words.forEach(w => {
          resolvedStyles[w.id] = resolveWordStyle(state.subtitleStyle, seg.id, w.id);
        });
      });

      const res = await fetch(`/api/projects/${project.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurements: measurements || null,
          subtitleMode,
          options,
          resolvedStyles
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(`Export failed to start: ${data.error}`);
        setExportStatus('failed');
      }
    } catch (err) {
      console.error('Export trigger failed:', err);
      setExportStatus('failed');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/download`);
      if (res.ok) {
        const { url } = await res.json();
        const a = document.createElement('a');
        a.href = url;
        a.download = `vidyut_export_${project.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Download link not ready or expired.");
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Poll for export status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (exportStatus === 'exporting') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.export_status === 'completed') {
              setExportStatus('completed');
              clearInterval(interval);
            } else if (data.export_status === 'failed') {
              setExportStatus('failed');
              clearInterval(interval);
            }
          }
        } catch {}
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [exportStatus, project.id]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const video = document.querySelector('video');

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) undo();
        } else if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else if (e.key === 'y') {
          e.preventDefault();
          if (canRedo) redo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      } else {
        // Single key shortcuts
        switch (e.key.toLowerCase()) {
          case ' ':
            e.preventDefault();
            if (video) {
              if (video.paused) video.play();
              else video.pause();
            }
            break;
          case 's': {
            e.preventDefault();
            const active = segments.find(s => currentTime >= s.start && currentTime <= s.end);
            if (active) splitSegment(active.id, currentTime);
            break;
          }
          case 'm': {
            e.preventDefault();
            const active = segments.find(s => currentTime >= s.start && currentTime <= s.end);
            if (active) mergeSegments(active.id);
            break;
          }
          case '1':
            e.preventDefault();
            setEditMode('line');
            break;
          case '2':
            e.preventDefault();
            setEditMode('word');
            break;
          case 'arrowleft':
            e.preventDefault();
            if (e.shiftKey) {
              setTimelineZoom(Math.max(10, timelineZoom - 10));
            } else if (video) {
              video.currentTime = Math.max(0, video.currentTime - 5);
            }
            break;
          case 'arrowright':
            e.preventDefault();
            if (e.shiftKey) {
              setTimelineZoom(Math.min(200, timelineZoom + 10));
            } else if (video) {
              video.currentTime = Math.min(video.duration, video.currentTime + 5);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, currentTime, segments, splitSegment, mergeSegments, timelineZoom, setTimelineZoom, setEditMode, handleSave]);

  // Fetch video presigned URL
  useEffect(() => {
    async function fetchVideoUrl() {
      try {
        const res = await fetch('/api/video/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: project.media_url }),
        });
        if (res.ok) {
          const { url } = await res.json();
          setVideoUrl(url);
        }
      } catch (err) {
        console.error('Failed to load video:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideoUrl();
  }, [project.media_url, setVideoUrl]);

  // Generate waveform if needed
  useEffect(() => {
    if (!videoUrl || (waveform && waveform.min.length > 0)) return;

    let isCancelled = false;
    async function generateWaveform() {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(videoUrl as string);
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const bucketsPerSecond = 100; // High resolution caching
        const samplesPerBucket = Math.floor(audioBuffer.sampleRate / bucketsPerSecond);
        
        const minPeaks: number[] = [];
        const maxPeaks: number[] = [];
        let globalMax = 0;
        
        for (let i = 0; i < channelData.length; i += samplesPerBucket) {
          let min = 0;
          let max = 0;
          for (let j = 0; j < samplesPerBucket && i + j < channelData.length; j++) {
            const val = channelData[i + j];
            if (val < min) min = val;
            if (val > max) max = val;
          }
          minPeaks.push(min);
          maxPeaks.push(max);
          if (max > globalMax) globalMax = max;
          if (-min > globalMax) globalMax = -min;
        }

        const normalizedMin = globalMax > 0 ? minPeaks.map(v => v / globalMax) : minPeaks;
        const normalizedMax = globalMax > 0 ? maxPeaks.map(v => v / globalMax) : maxPeaks;
        
        if (!isCancelled) {
          setWaveform({
            min: normalizedMin,
            max: normalizedMax,
            resolution: bucketsPerSecond
          });
        }
      } catch (err) {
        console.error('Failed to generate waveform:', err);
      }
    }
    generateWaveform();

    return () => {
      isCancelled = true;
    };
  }, [videoUrl, waveform, setWaveform]);

  // Dynamically load font
  useEffect(() => {
    const fontName = subtitleStyle.font.family;
    if (fontName === 'Geist' || fontName === 'Inter') return; // Loaded via next/font

    const linkId = `font-${fontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, [subtitleStyle.font.family]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between h-12 px-4 bg-zinc-950 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </Link>
          <div className="w-px h-5 bg-white/10" />
          <h1 className="text-sm font-medium text-zinc-300 truncate max-w-[300px]">
            {project.title || 'Untitled Project'}
          </h1>
          <div className="w-px h-5 bg-white/10 mx-2" />
          
          {/* Undo/Redo Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg transition-colors ${
                canUndo ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg transition-colors ${
                canRedo ? 'hover:bg-zinc-800 text-zinc-300' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded uppercase">
            {transcription.language}
          </span>

          {/* Subtitle Mode Toggle Group */}
          <div className="flex items-center bg-zinc-900 border border-white/5 rounded-lg p-0.5 relative select-none">
            {(['original', 'transliterated', 'translated'] as const).map((mode) => {
              const isActive = subtitleMode === mode;
              const label = mode === 'original' ? 'Original' : mode === 'transliterated' ? 'Romanized' : 'Translated';
              return (
                <button
                  key={mode}
                  onClick={() => setSubtitleMode(mode)}
                  className={`relative px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer z-10 ${
                    isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-script-mode"
                      className="absolute inset-0 bg-white/10 rounded-md -z-10 border border-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || exportStatus === 'exporting'}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
              saveStatus === 'saving'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                : saveStatus === 'saved'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : saveStatus === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-300'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Save Failed!' : 'Save'}
          </button>
          
          {exportStatus === 'completed' ? (
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white shadow-lg shadow-emerald-500/15 flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download Video
            </button>
          ) : (
            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={exportStatus === 'exporting'}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-2 ${
                exportStatus === 'exporting'
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                  : exportStatus === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-violet-600 hover:bg-violet-500 border-violet-500/30 text-white shadow-lg shadow-violet-500/15'
              }`}
            >
              {exportStatus === 'exporting' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Exporting...
                </>
              ) : exportStatus === 'failed' ? (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Export Failed - Retry
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Export Video
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Editor Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Transcript Panel */}
        <div className="w-[340px] shrink-0">
          <TranscriptPanel />
        </div>

        {/* Center & Right Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Player & Style Panel Row */}
          <div className="flex-1 flex min-h-0">
            {/* Video Player */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-900/30 overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center">
                <VideoPlayer ref={videoPlayerRef} />
              </div>
            </div>

            {/* Style Panel */}
            <div className="w-[320px] shrink-0 border-l border-white/5">
              <StylePanel />
            </div>
          </div>

          {/* Bottom: Timeline Panel */}
          <Timeline />
        </div>
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        isExporting={exportStatus === 'exporting'}
      />
    </div>
  );
}
