import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download, Film } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ExportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: exports } = await supabase
    .from('exports')
    .select('id, project_id, status, has_watermark, file_size, expires_at, created_at, projects(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
        <h1 className="mt-3 text-4xl font-bold">My exports</h1>
        <p className="mt-2 text-zinc-400">Your latest 50 rendered videos.</p>
        {!exports?.length ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-950 p-16 text-center"><Film className="mx-auto h-10 w-10 text-zinc-600" /><p className="mt-4 text-zinc-400">No exports yet.</p></div>
        ) : (
          <div className="mt-8 space-y-3">{exports.map((item) => {
            const expired = item.expires_at ? new Date(item.expires_at).getTime() < Date.now() : false;
            const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
            return <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-5"><div className="min-w-0"><p className="truncate font-medium">{project?.title || 'Untitled export'}</p><p className="mt-1 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()} · {item.has_watermark ? 'Watermarked' : 'No watermark'} · {item.status}</p></div>{item.status === 'completed' && !expired ? <a href={`/api/exports/${item.id}/download`} className="flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"><Download className="h-4 w-4" />Download</a> : <span className="text-xs text-zinc-600">{expired ? 'Expired' : 'Processing'}</span>}</div>;
          })}</div>
        )}
      </div>
    </main>
  );
}
