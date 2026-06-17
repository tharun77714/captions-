import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { EditorClient } from '@/components/editor/editor-client';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Redirect to project page if not ready
  if (project.status !== 'ready') {
    redirect(`/dashboard/projects/${id}`);
  }

  // Fetch transcription
  const { data: transcription, error: transError } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('project_id', id)
    .single();

  if (transError || !transcription) {
    notFound();
  }

  return (
    <EditorClient
      project={{
        id: project.id,
        title: project.title,
        media_url: project.media_url,
        status: project.status,
        subtitle_style: project.subtitle_style,
      }}
      transcription={{
        language: transcription.language,
        segments: transcription.segments,
        words: transcription.words,
        transliteratedSegments: transcription.transliterated_segments || null,
        transliteratedWords: transcription.transliterated_words || null,
        translatedSegments: transcription.translated_segments || null,
        translatedWords: null,
        waveform: transcription.waveform || [],
      }}
    />
  );
}
