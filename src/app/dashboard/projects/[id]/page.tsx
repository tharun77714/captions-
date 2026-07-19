import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Clock, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { ExportStatusTracker } from '@/components/dashboard/export-status-tracker';

import { LocalDate } from '@/components/dashboard/local-date';

import { ProcessingTracker } from '@/components/dashboard/processing-tracker';

// Helper for formatting time (e.g., 65.4s -> 01:05)
function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // 1. Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // 2. Fetch transcription (if ready)
  let transcription = null;
  if (project.status === 'ready') {
    const { data: transData } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('project_id', id)
      .single();
    transcription = transData;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
      <main className="container max-w-6xl px-6 py-12 mx-auto">
        {/* Header */}
        <div className="flex items-center mb-10">
          <Link href="/dashboard" className="mr-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{project.title || 'Untitled Project'}</h1>
            <div className="flex items-center mt-2 space-x-4 text-sm text-zinc-500">
              <LocalDate timestamp={project.created_at} />
              <span>•</span>
              <StatusBadge status={project.status} />
              {transcription?.language && (
                <>
                  <span>•</span>
                  <span className="uppercase px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">
                    {transcription.language}
                  </span>
                </>
              )}
            </div>
          </div>
          {project.status === 'ready' && (
            <Link
              href={`/dashboard/projects/${id}/editor`}
              className="ml-4 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Open Editor
            </Link>
          )}
        </div>

        {/* Export Tracking */}
        {project.status === 'ready' && (
          <ExportStatusTracker projectId={id} initialStatus={project.export_status || 'none'} />
        )}
        
        {/* Background Processing Polling Tracker */}
        <ProcessingTracker projectId={id} initialStatus={project.status} />

        {/* Content based on status */}
        {project.status === 'queued' && <ProcessingState message="Waiting in queue..." icon={<Clock className="w-10 h-10 text-zinc-500" />} />}
        {project.status === 'transcribing' && <ProcessingState message="Extracting audio & running AI models..." icon={<Loader2 className="w-10 h-10 text-violet-500 animate-spin" />} />}
        {project.status === 'failed' && <ErrorState message={project.title} />}
        
        {project.status === 'ready' && transcription && (
          <TranscriptViewer transcription={transcription} />
        )}
      </main>
    </div>
  );
}

// Processing State Component
function ProcessingState({ message, icon }: { message: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 border border-white/5 bg-zinc-900/20 rounded-2xl">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
        {icon}
      </div>
      <h2 className="text-2xl font-semibold mb-2">Processing Video</h2>
      <p className="text-zinc-400">{message}</p>
      <p className="text-xs text-zinc-600 mt-8">This page will automatically update when complete.</p>
    </div>
  );
}

// Error State Component
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 border border-red-500/20 bg-red-500/5 rounded-2xl">
      <AlertCircle className="w-12 h-12 text-red-500 mb-6" />
      <h2 className="text-2xl font-semibold mb-2 text-red-400">Transcription Failed</h2>
      <p className="text-red-400/80 max-w-md text-center">{message || "An unknown error occurred during processing."}</p>
    </div>
  );
}

interface Word {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface Transcription {
  language: string;
  segments: Segment[];
  words: Word[];
}

// Transcript Viewer Component
function TranscriptViewer({ transcription }: { transcription: Transcription }) {
  const { segments, words } = transcription;
  
  if (!segments || segments.length === 0) {
    return (
      <div className="py-20 text-center border border-white/5 rounded-2xl bg-zinc-900/30">
        <p className="text-zinc-500">No speech detected in this video.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Readable Paragraphs */}
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 bg-zinc-950 border border-white/10 rounded-2xl">
          <h2 className="text-lg font-medium mb-6 text-zinc-200">Readable Transcript</h2>
          <div className="space-y-4 text-zinc-300 leading-relaxed text-lg">
            {segments.map((segment: Segment, i: number) => (
              <p key={i} className="hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer group">
                <span className="text-xs text-zinc-600 font-mono mr-3 select-none group-hover:text-violet-400">
                  {formatTimestamp(segment.start)}
                </span>
                {segment.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Word-level Data (Prep for Editor) */}
      <div className="lg:col-span-1">
        <div className="p-6 bg-zinc-950 border border-white/10 rounded-2xl h-[800px] overflow-y-auto">
          <h2 className="text-lg font-medium mb-6 text-zinc-200 sticky top-0 bg-zinc-950 py-2">Word Timestamps</h2>
          <div className="flex flex-col space-y-2">
            {words?.map((word: Word, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-900 transition-colors group">
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{word.word}</span>
                <div className="flex items-center space-x-3 font-mono text-xs text-zinc-500">
                  <span>{word.start.toFixed(2)}s - {word.end.toFixed(2)}s</span>
                  {word.probability && (
                    <span className={`w-8 text-right ${word.probability > 0.8 ? 'text-emerald-500/70' : 'text-amber-500/70'}`}>
                      {Math.round(word.probability * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return (
        <span className="flex items-center text-emerald-400">
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Ready
        </span>
      );
    case 'transcribing':
      return (
        <span className="flex items-center text-violet-400">
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          Processing
        </span>
      );
    case 'queued':
      return (
        <span className="flex items-center text-zinc-400">
          <Clock className="w-4 h-4 mr-1.5" />
          Queued
        </span>
      );
    case 'failed':
      return (
        <span className="flex items-center text-red-400">
          <AlertCircle className="w-4 h-4 mr-1.5" />
          Failed
        </span>
      );
    default:
      return <span className="text-zinc-500">{status}</span>;
  }
}
