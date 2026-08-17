'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore, Segment, Word, SubtitleStyle } from '@/store/editor-store';
import { Loader2, ArrowLeft, Undo2, Redo2, Check, Download, AlignLeft, Video, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { ensureV3 } from '@/lib/subtitle-schema-v3';
import { TranscriptPanelV2 } from './transcript-panel-v2';
import { StylePanelV2 } from './style-panel-v2';
import { TimelineV2 } from './timeline-v2';
import { VideoPlayerV2 } from './video-player-v2';

interface EditorClientV2Props {
  userId?: string;
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

type FocusMode = 'transcript' | 'canvas' | 'balanced';

export function EditorClientV2({ userId, project, transcription }: EditorClientV2Props) {
  const {
    setProjectData,
    setTranscriptData,
    setUserId,
    setSubtitleStyle,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  const [editorReady, setEditorReady] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>('balanced');
  
  // Initialize store
  useEffect(() => {
    setEditorReady(false);
    setUserId(userId || null);
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
    setSubtitleStyle(ensureV3(project.subtitle_style || {}));
    setEditorReady(true);
  }, [project, transcription, userId, setUserId, setProjectData, setTranscriptData, setSubtitleStyle]);

  if (!editorReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0E0E10] text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Calculate layout widths based on focus mode
  const getLayoutStyles = () => {
    switch (focusMode) {
      case 'transcript':
        return { left: '50%', center: '25%', right: '25%' };
      case 'canvas':
        return { left: '0%', center: '70%', right: '30%' }; // Left panel collapsed
      case 'balanced':
      default:
        return { left: '38%', center: '34%', right: '28%' }; // Mandatory default split
    }
  };

  const layout = getLayoutStyles();

  return (
    <div className="flex h-screen w-full flex-col bg-[#0E0E10] text-[#FAFAFA] font-sans overflow-hidden text-[12px]">
      {/* TOP BAR (52px height as per 1366x768 validation reqs) */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#27272A] px-4 bg-[#0E0E10]">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${project.id}`} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="font-medium truncate max-w-[200px] text-[13px]">{project.title}</div>
        </div>

        <div className="flex items-center gap-2 border border-[#27272A] rounded bg-[#18181B] p-1">
          <button 
            disabled={!canUndo} 
            onClick={undo}
            className="p-1 rounded hover:bg-[#27272A] disabled:opacity-50 text-zinc-400 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button 
            disabled={!canRedo} 
            onClick={redo}
            className="p-1 rounded hover:bg-[#27272A] disabled:opacity-50 text-zinc-400 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {/* Focus Mode Switcher */}
        <div className="flex items-center gap-1 border border-[#27272A] rounded p-1 bg-[#18181B]">
          <button 
            onClick={() => setFocusMode('transcript')}
            className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${focusMode === 'transcript' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
            title="Transcript Focus"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setFocusMode('canvas')}
            className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${focusMode === 'canvas' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
            title="Canvas Focus"
          >
            <Video className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setFocusMode('balanced')}
            className={`p-1.5 rounded flex items-center gap-1.5 transition-colors ${focusMode === 'balanced' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'text-zinc-400 hover:text-white'}`}
            title="Reset Layout"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-teal-400 font-medium px-2">
            <Check className="h-3.5 w-3.5" />
            <span>Saved</span>
          </div>
          <button className="h-8 px-4 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-[#27272A] border border-[#3F3F46]"></div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT: Transcript Panel */}
        {layout.left !== '0%' && (
          <div 
            style={{ width: layout.left }} 
            className="flex flex-col h-full border-r border-[#27272A] bg-[#18181B] shrink-0 transition-all duration-300 relative"
          >
            <div className="flex-1 overflow-hidden relative">
               <TranscriptPanelV2 />
            </div>
            {/* TIMELINE (Docked at bottom of left panel, 120px height) */}
            <div className="h-[120px] shrink-0 border-t border-[#27272A] bg-[#0E0E10] flex flex-col">
               <TimelineV2 />
            </div>
          </div>
        )}

        {/* CENTER: Canvas Preview */}
        <div 
          style={{ width: layout.center }} 
          className="flex flex-col h-full bg-[#0E0E10] shrink-0 transition-all duration-300 relative"
        >
          <VideoPlayerV2 project={project} />
        </div>

        {/* RIGHT: Inspector */}
        <div 
          style={{ width: layout.right }} 
          className="flex flex-col h-full border-l border-[#27272A] bg-[#18181B] shrink-0 transition-all duration-300 relative"
        >
          <StylePanelV2 />
        </div>
      </div>
    </div>
  );
}
