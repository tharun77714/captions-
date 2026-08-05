import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: project, error } = await supabase
      .from('projects')
      .select('status, export_status, export_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("Project fetch error:", error);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }


    const result = {
      status: project.status,
      export_status: project.export_status || 'none',
      export_url: project.export_url,
      progress: project.export_status === 'completed' ? 100 : 0,
      stage: project.export_status === 'completed' ? 'Completed' : '',
      job_id: null
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Project fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { title } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const { error } = await supabase.from('projects').update({ title: title.trim() }).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
