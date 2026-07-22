'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore, Segment, Word, SubtitleStyle } from '@/store/editor-store';
import { resolveWordStyle } from '@/lib/subtitle-schema-v3';
import { VideoPlayer, VideoPlayerRef } from '@/components/editor/video-player';
import { TranscriptPanel } from '@/components/editor/transcript-panel';
import { StylePanel } from '@/components/editor/style-panel';
import { Timeline } from '@/components/editor/timeline';
import { Loader2, ArrowLeft, Undo2, Redo2, Download, Video, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { ensureV3, getAllUsedFonts } from '@/lib/subtitle-schema-v3';
import { preloadFonts } from '@/lib/font-registry';
import { motion, AnimatePresence } from 'framer-motion';
import { useRemotionExport } from '@/hooks/use-remotion-export';

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
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Remotion Browser Export integration
  const {
    phase: exportStatus,
    progress: exportProgress,
    error: exportError,
    downloadUrl,
    startExport,
    cancel: handleCancel,
  } = useRemotionExport();

  const [showExportOverlay, setShowExportOverlay] = useState(false);

  useEffect(() => {
    if (exportStatus !== 'idle') {
      setShowExportOverlay(true);
    }
  }, [exportStatus]);

  // Initialize store with server data
  useEffect(() => {
    setProjectData({
      projectId: project.id,
      projectTitle: project.title,
      language: transcription.language,
    });
    
    const serverWaveform = transcription.waveform && transcription.waveform.length > 0
      ? {
          min: transcription.waveform.map(v => -(v / 100)),
          max: transcription.waveform.map(v => (v / 100)),
          resolution: 100
        }
      : undefined;

    setTranscriptData(
      transcription.segments,
      transcription.words,
      transcription.transliteratedSegments || undefined,
      transcription.transliteratedWords || undefined,
      transcription.translatedSegments || undefined,
      transcription.translatedWords || undefined,
      serverWaveform
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
      const validation = validateTimingModel();
      if (!validation.isValid) {
        console.error('Save aborted due to timing validation failure:', validation.errors);
        alert('Cannot save: Timing model corrupted.\n\n' + validation.errors.join('\n'));
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return false;
      }

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

  const handleExport = React.useCallback(async () => {
    const saved = await handleSave();
    if (!saved) return;

    if (!videoUrl) {
      alert('Error: Video source is not loaded yet.');
      return;
    }

    const state = useEditorStore.getState();
    const meta = videoPlayerRef.current?.getVideoMetadata();
    const durationSeconds = meta?.duration || state.duration || 0;
    const width = meta?.width || 1080;
    const height = meta?.height || 1920;

    if (!durationSeconds || durationSeconds <= 0) {
      alert('Error: Video duration is unavailable. Please wait for the video to load metadata.');
      return;
    }

    const currentSegments = state.segments;

    console.log('[EditorClient] Starting browser Remotion export...', {
      projectId: project.id,
      videoUrl,
      durationSeconds,
      subtitleStyle,
      subtitleMode,
      useCompositionRenderer: state.useCompositionRenderer,
      width,
      height,
    });

    startExport({
      projectId: project.id,
      videoUrl,
      durationSeconds,
      segments: currentSegments,
      subtitleStyle,
      subtitleMode,
      useCompositionRenderer: state.useCompositionRenderer,
      computedBlocks: state.computedBlocks || [],
      width,
      height,
      fps: 30,
    });
  }, [project.id, handleSave, videoUrl, subtitleStyle, subtitleMode, startExport]);


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Load video via same-origin proxy to avoid R2 CORS restrictions
  useEffect(() => {
    async function fetchVideoUrl() {
      // If media_url is already a full URL (e.g. from a public CDN), use it directly
      if (project.media_url?.startsWith('http')) {
        setVideoUrl(project.media_url);
        setLoading(false);
        return;
      }
      try {
        // Use the server-side proxy route instead of a presigned URL.
        // This avoids CORS since the browser fetches from the same Vercel origin.
        const proxyUrl = `/api/video/stream?key=${encodeURIComponent(project.media_url)}`;
        setVideoUrl(proxyUrl);
      } catch (err) {
        console.error('Failed to set video URL:', err);
        setVideoLoadError('Could not load video — check your network or storage configuration.');
      } finally {
        setLoading(false);
      }
    }
    fetchVideoUrl();
  }, [project.media_url, setVideoUrl]);

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

  const isExporting = ['preparing', 'rendering', 'uploading'].includes(exportStatus);

  const exportStage =
    exportStatus === 'preparing' ? 'Preparing video composition...' :
    exportStatus === 'rendering' ? 'Rendering video frames...' :
    exportStatus === 'uploading' ? 'Uploading MP4 to storage...' :
    exportStatus === 'done' ? 'Completed' : '';

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
            disabled={saveStatus === 'saving'}
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

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1.5 ${
              isExporting
                ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 cursor-not-allowed'
                : exportStatus === 'done'
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                : 'bg-violet-600 hover:bg-violet-500 border-violet-500 text-white'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Exporting...
              </>
            ) : exportStatus === 'done' ? (
              <>
                <Download className="w-3.5 h-3.5" />
                Re-export
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                Export Video
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Editor Layout */}
      <div className="flex flex-1 min-h-0 relative">
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
              {videoLoadError && (
                <div className="absolute top-3 left-3 right-3 z-50 flex items-start gap-2 bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <div>
                    <p className="font-semibold text-rose-200">Video failed to load</p>
                    <p className="mt-0.5 text-rose-400">{videoLoadError}</p>
                    <p className="mt-1 text-rose-500">Check that <code className="bg-rose-900/50 px-1 rounded">R2_ACCOUNT_ID</code>, <code className="bg-rose-900/50 px-1 rounded">R2_ACCESS_KEY_ID</code>, and <code className="bg-rose-900/50 px-1 rounded">R2_SECRET_ACCESS_KEY</code> are set in Vercel environment variables.</p>
                  </div>
                </div>
              )}
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

        {/* Milestone 5 Premium Export Progress Overlay */}
        <AnimatePresence>
          {showExportOverlay && exportStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-6 right-6 w-96 backdrop-blur-xl bg-zinc-950/85 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Overlay Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Video Export</span>
                </div>
                <button
                  onClick={() => setShowExportOverlay(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Overlay Body */}
              <div className="p-5">
                {isExporting ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium">{exportStage || 'Processing...'}</span>
                      <span className="font-mono text-violet-400 font-bold">{exportProgress}%</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-zinc-500">Do not close this page</span>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel Export
                      </button>
                    </div>
                  </div>
                ) : exportStatus === 'done' ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-400">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Export Finished Successfully!</h4>
                      <p className="text-xs text-zinc-400 mt-1">Your video with subtitles is ready for download.</p>
                    </div>
                    {downloadUrl ? (
                      <a
                        href={downloadUrl}
                        download={`vidyut_export_${project.id}.mp4`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
                      >
                        <Download className="w-4 h-4" />
                        Download MP4
                      </a>
                    ) : (
                      <div className="text-xs text-zinc-500 animate-pulse">Generating secure download link...</div>
                    )}
                  </div>
                ) : exportStatus === 'cancelled' ? (
                  <div className="text-center py-4 space-y-3">
                    <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
                    <p className="text-xs text-zinc-400">Export was cancelled by user.</p>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Start Export
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <div>
                      <h4 className="text-xs font-semibold text-rose-400">Export Failed</h4>
                      <p className="text-[10px] text-rose-400 mt-1 max-w-[280px] mx-auto whitespace-pre-wrap">{exportError || 'An unknown error occurred.'}</p>
                    </div>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Retry Export
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

