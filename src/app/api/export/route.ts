import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SnapshotBuilder } from '@/lib/services/snapshot-builder';
import { SnapshotValidator } from '@/lib/services/snapshot-validator';
import { RevisionHasher } from '@/lib/services/revision-hasher';
import { getWorkerClient } from '@/lib/worker/client';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const snapshot = await SnapshotBuilder.build(projectId);
    SnapshotValidator.validate(snapshot);

    const revisionHash = RevisionHasher.hash(snapshot);
    const snapshotHash = crypto.createHash('sha256').update(JSON.stringify(snapshot, Object.keys(snapshot).sort())).digest('hex');

    const { data: existingJob } = await supabaseAdmin
      .from('export_jobs')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('revision_hash', revisionHash)
      .in('status', ['queued', 'starting', 'planning', 'rendering', 'encoding', 'mixing', 'muxing', 'uploading'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      console.log(`[ExportAPI] Idempotency Hit. Reusing job ${existingJob.id} (status: ${existingJob.status})`);
      return NextResponse.json({ jobId: existingJob.id, reused: true });
    }

    const { data: newJob, error: insertError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        project_id: projectId,
        status: 'queued',
        progress: 0,
        stage: 'Queued',
        payload_snapshot: snapshot,
        revision_hash: revisionHash,
        snapshot_hash: snapshotHash,
        attempt_number: 1,
        max_attempts: 3,
        version: 1
      })
      .select('id')
      .single();

    if (insertError || !newJob) {
      console.error('Failed to create export job in DB:', insertError);
      return NextResponse.json({ error: 'Database failed to create export job' }, { status: 500 });
    }

    await supabaseAdmin
      .from('projects')
      .update({ export_status: 'exporting', export_error: null })
      .eq('id', projectId);

    const workerClient = getWorkerClient();
    workerClient.submitJob(newJob.id, projectId).catch(err => {
      console.error('Failed to submit job to worker:', err);
    });

    return NextResponse.json({ jobId: newJob.id, reused: false });
  } catch (error: unknown) {
    console.error('Error in export POST:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
