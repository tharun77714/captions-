import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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

    // Core exporting must not depend on the optional billing/usage schema.
    // Billing limits can be enforced later once that product surface is enabled.
    const exportId = crypto.randomUUID();
    if (!isUuid(exportId)) return NextResponse.json({ error: 'Could not create export ID' }, { status: 500 });

    const { error: statusError } = await supabase.from('projects').update({
      export_status: 'rendering',
      export_error: null,
    }).eq('id', projectId).eq('user_id', user.id);
    if (statusError) {
      console.error('[ExportAuthorize] Could not mark project as rendering:', statusError);
      return NextResponse.json({ error: 'Could not start the export. Please retry.' }, { status: 500 });
    }

    return NextResponse.json({
      exportId,
      watermark: false,
      plan: 'free',
    });
  } catch (error) {
    console.error('[ExportAuthorize] Failed:', error);
    return NextResponse.json({ error: 'Could not authorize export' }, { status: 500 });
  }
}
