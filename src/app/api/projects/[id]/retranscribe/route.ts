import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { language } = await req.json();

  // Fetch project to get media_url
  const { data: project } = await supabase
    .from('projects')
    .select('media_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Reset project status
  await supabase.from('projects').update({ status: 'transcribing' }).eq('id', id);

  // Delete old transcription
  await supabase.from('transcriptions').delete().eq('project_id', id);

  // Trigger Modal webhook again
  const webhookUrl = process.env.MODAL_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: id,
        media_key: project.media_url,
        language: language || 'auto',
      }),
    });
  }

  return NextResponse.json({ ok: true, status: 'transcribing' });
}
