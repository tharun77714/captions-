import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { projectId, styleName = '3D_CLIMAX', aspectRatio = '9:16', heroWordIds = [] } = await request.json();

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id, media_url, user_id, title')
      .eq('id', projectId)
      .maybeSingle();

    if (projError || !project) {
      console.error('[HyperFrames Export] Project query failed:', projError, projectId);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Set export status to rendering
    await supabase.from('projects').update({
      export_status: 'rendering',
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
          style_name: styleName,
          aspect_ratio: aspectRatio,
          hero_word_ids: heroWordIds,
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
      message: 'HyperFrames 3D render job sent to Modal GPU worker',
    });
  } catch (error) {
    console.error('[HyperFrames Export] API error:', error);
    return NextResponse.json({ error: 'Failed to initiate HyperFrames render' }, { status: 500 });
  }
}
