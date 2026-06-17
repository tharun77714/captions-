import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Parse body to get measurements and subtitleMode
    let measurements = null;
    let subtitleMode = 'original';
    let resolvedStyles = null;
    try {
      const body = await request.json();
      measurements = body.measurements || null;
      subtitleMode = body.subtitleMode || 'original';
      resolvedStyles = body.resolvedStyles || null;
      console.log('[EXPORT PARITY] Measurements received:', measurements ? 'YES' : 'NO', 'SubtitleMode:', subtitleMode);
      if (measurements) {
        console.log('[EXPORT PARITY] containerHeight:', measurements.containerHeight);
        console.log('[EXPORT PARITY] videoHeight:', measurements.videoHeight);
        console.log('[EXPORT PARITY] scaleFactor:', measurements.scaleFactor);
        console.log('[EXPORT PARITY] fontSize:', measurements.fontSize);
        console.log('[EXPORT PARITY] bottomOffset:', measurements.bottomOffset);
      }
    } catch {
      console.log('[EXPORT PARITY] No body received — measurements will be null');
      // No body or invalid JSON — measurements will be null
    }

    // Verify project exists
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Ensure it's not already exporting
    if (project.export_status === 'exporting') {
      return NextResponse.json({ error: 'Project is already exporting' }, { status: 400 });
    }

    // Set status to exporting
    const { error: updateError } = await supabase
      .from('projects')
      .update({ export_status: 'exporting', export_error: null })
      .eq('id', id);

    if (updateError) {
      console.warn('DB update failed (likely missing columns). Bypassing for testing:', updateError);
    }

    // Trigger Modal worker with measurements and subtitle_mode
    const modalWebhookUrl = process.env.MODAL_EXPORT_WEBHOOK_URL;
    if (modalWebhookUrl) {
      fetch(modalWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          s3_key: project.media_url,
          measurements: measurements,
          subtitle_mode: subtitleMode,
          resolved_styles: resolvedStyles,
        })
      }).catch(err => console.error('Failed to trigger Modal export worker:', err));
    } else {
      console.warn("MODAL_EXPORT_WEBHOOK_URL not configured. Worker will not start.");
    }

    return NextResponse.json({ status: 'exporting' });
  } catch (error: unknown) {
    console.error('Export trigger error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
