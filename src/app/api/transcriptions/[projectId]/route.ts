import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const body = await request.json();
    const {
      segments,
      words,
      transliteratedSegments,
      transliteratedWords,
      translatedSegments,
      subtitleStyle
    } = body;

    // 1. Basic validation
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({ error: 'Invalid or missing segments' }, { status: 400 });
    }
    if (!words || !Array.isArray(words)) {
      return NextResponse.json({ error: 'Invalid or missing words' }, { status: 400 });
    }
    if (!subtitleStyle || typeof subtitleStyle !== 'object') {
      return NextResponse.json({ error: 'Invalid or missing subtitleStyle' }, { status: 400 });
    }

    // Initialize Supabase Admin Client using Service Role Key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Perform updates
    // Update transcriptions table (segments, words, transliterated and translated)
    const { error: transError } = await supabaseAdmin
      .from('transcriptions')
      .update({
        segments,
        words,
        transliterated_segments: transliteratedSegments || null,
        transliterated_words: transliteratedWords || null,
        translated_segments: translatedSegments || null,
      })
      .eq('project_id', projectId);

    if (transError) {
      console.error('Failed to update transcription:', transError);
      return NextResponse.json({ error: `Failed to update transcription: ${transError.message}` }, { status: 500 });
    }

    // Update projects table (subtitle_style)
    const { error: projectError } = await supabaseAdmin
      .from('projects')
      .update({
        subtitle_style: subtitleStyle,
      })
      .eq('id', projectId);

    if (projectError) {
      console.error('Failed to update project style:', projectError);
      return NextResponse.json({ error: `Failed to update project style: ${projectError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving transcription edits:', error);
    const message = error instanceof Error ? error.message : 'Failed to save changes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
