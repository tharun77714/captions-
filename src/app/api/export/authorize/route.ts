import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { effectivePlan } from '@/lib/billing/plans';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });

    const exportId = crypto.randomUUID();
    const admin = createAdminClient();
    const reservation = await admin.rpc('reserve_usage', {
      p_user_id: user.id,
      p_resource: 'export',
      p_amount: 1,
      p_reference_id: exportId,
    });
    if (reservation.error) {
      console.error('[ExportAuthorize] Usage reservation failed:', reservation.error);
      return NextResponse.json({ error: 'Usage limits are not ready. Apply the billing migration first.' }, { status: 503 });
    }

    const result = reservation.data as { allowed?: boolean; plan?: string; limit?: number } | null;
    if (!result?.allowed) {
      return NextResponse.json({
        error: `You have reached your export limit (${result?.limit ?? 0}). Upgrade your plan to export again.`,
      }, { status: 429 });
    }

    const plan = effectivePlan(result.plan, 'active');
    const storageKey = `${user.id}/${projectId}/exports/${exportId}.mp4`;
    const expiresAt = plan === 'free' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null;
    const { error: insertError } = await admin.from('exports').insert({
      id: exportId,
      user_id: user.id,
      project_id: projectId,
      storage_key: storageKey,
      status: 'rendering',
      has_watermark: plan === 'free',
      expires_at: expiresAt,
    });
    if (insertError) {
      await admin.rpc('release_usage', { p_user_id: user.id, p_resource: 'export', p_reference_id: exportId });
      console.error('[ExportAuthorize] Export row creation failed:', insertError);
      return NextResponse.json({ error: 'Could not start the export. Please retry.' }, { status: 500 });
    }

    return NextResponse.json({ exportId, watermark: plan === 'free', plan });
  } catch (error) {
    console.error('[ExportAuthorize] Failed:', error);
    return NextResponse.json({ error: 'Could not authorize export' }, { status: 500 });
  }
}
