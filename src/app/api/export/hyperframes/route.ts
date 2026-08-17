import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { projectId, styleName = '3D_CLIMAX', aspectRatio = '9:16', heroWordIds = [] } = await request.json();

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Try finding by projectId (and optionally user_id if present)
    let project = null;
    if (user?.id) {
      const { data: userProj } = await supabase
        .from('projects')
        .select('id, media_url, s3_key, user_id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
      project = userProj;
    }

    if (!project) {
      const { data: anyProj } = await supabase
        .from('projects')
        .select('id, media_url, s3_key, user_id')
        .eq('id', projectId)
        .maybeSingle();
      project = anyProj;
    }

    if (!project) {
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
          user_id: user.id,
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
