import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project, error } = await supabase
      .from('projects')
      .select('status, export_status, export_url')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Project fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
