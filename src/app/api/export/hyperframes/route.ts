import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      styleName = 'kalakar-glow',
      templateId,
      aspectRatio = '9:16',
      heroWordIds = [],
      subtitleStyle,
      scriptMode = 'original',
      words = [],
      enable3D = true,
    } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id, media_url, user_id, title, subtitle_style')
      .eq('id', projectId)
      .maybeSingle();

    if (projError || !project) {
      console.error('[HyperFrames Export] Project query failed:', projError, projectId);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If subtitleStyle is not passed in request, retrieve it from project or transcription
    let effectiveStyle = subtitleStyle || project.subtitle_style;
    if (!effectiveStyle) {
      const { data: trans } = await supabase
        .from('transcriptions')
        .select('subtitle_style')
        .eq('project_id', projectId)
        .maybeSingle();
      effectiveStyle = trans?.subtitle_style || null;
    }

    // Set export status to rendering and clear previous export_url
    await supabase.from('projects').update({
      export_status: 'rendering',
      export_url: null,
      export_error: null,
    }).eq('id', projectId);

    // Call Deployed Modal HyperFrames Worker
    const modalUrl = process.env.MODAL_HYPERFRAMES_URL || 'https://varunchow123--vidyut-hyperframes-trigger-hyperframes.modal.run';

    try {
      const modalRes = await fetch(modalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          user_id: project.user_id || 'anonymous',
          style_name: styleName || templateId || 'kalakar-glow',
          template_id: templateId || styleName || 'kalakar-glow',
          aspect_ratio: aspectRatio,
          hero_word_ids: heroWordIds,
          subtitle_style: effectiveStyle,
          script_mode: scriptMode,
          words: words,
          enable_3d: enable3D,
        }),
      });

      if (!modalRes.ok) {
        console.warn('[HyperFrames Export] Modal trigger returned non-200:', modalRes.status);
      }
    } catch (fetchErr) {
      console.warn('[HyperFrames Export] Failed to reach Modal directly:', fetchErr);
    }

    return NextResponse.json({
      success: true,
      status: 'rendering',
      message: 'HyperFrames render job sent to Modal GPU worker',
    });
  } catch (error) {
    console.error('[HyperFrames Export] API error:', error);
    return NextResponse.json({ error: 'Failed to initiate HyperFrames render' }, { status: 500 });
  }
}
