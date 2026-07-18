import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWorkerClient } from '@/lib/worker/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: updated, error } = await supabaseAdmin
      .from('export_jobs')
      .update({ cancel_requested: true, status: 'cancelled' })
      .eq('id', jobId)
      .select('project_id')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Failed to request cancellation' }, { status: 500 });
    }

    await supabaseAdmin
      .from('projects')
      .update({ export_status: 'failed', export_error: 'Export was cancelled by user.' })
      .eq('id', updated.project_id);

    const client = getWorkerClient();
    await client.cancelJob(jobId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error cancelling export:', err);
    return NextResponse.json({ error: 'Failed to cancel export' }, { status: 500 });
  }
}
