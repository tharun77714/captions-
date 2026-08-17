import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download, Film, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isMissingExportsTableError, mergeExportsAndProjects, BaseExportItem } from '@/lib/db-utils';

export const dynamic = 'force-dynamic';

export default async function ExportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  let items: BaseExportItem[] = [];
  let userFacingError: string | null = null;

  // 1. Fetch completed project exports (canonical source for latest export per project)
  let projectItems: BaseExportItem[] = [];
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, export_status, export_url, created_at')
    .eq('user_id', user.id)
    .neq('export_status', 'none')
    .order('created_at', { ascending: false })
    .limit(50);

  if (projectsError) {
    console.error('[ExportsPage] Error querying projects table:', projectsError);
    userFacingError = 'Unable to load exports due to a database issue. Please try again later.';
  } else if (projectsData) {
    projectItems = projectsData.map((p) => {
      const isCompleted = p.export_status === 'completed' && Boolean(p.export_url);
      return {
        id: p.id,
        projectId: p.id,
        title: p.title || 'Untitled project',
        createdAt: p.created_at,
        status: p.export_status || 'unknown',
        downloadUrl: isCompleted ? `/api/projects/${p.id}/download` : null,
        source: 'projects_fallback',
      };
    });
    items = projectItems;
  }

  // 2. Query public.exports if available for historical records
  const { data: exportsData, error: exportsError } = await supabase
    .from('exports')
    .select('id, project_id, status, has_watermark, expires_at, created_at, projects(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (exportsError) {
    if (!isMissingExportsTableError(exportsError)) {
      console.error('[ExportsPage] Unexpected database query error on exports table:', exportsError);
      if (!userFacingError) {
        userFacingError = 'Unable to load historical export records. Showing project exports.';
      }
    }
  } else if (exportsData && exportsData.length > 0) {
    const exportsItems: BaseExportItem[] = exportsData.map((item) => {
      const expired = item.expires_at ? new Date(item.expires_at).getTime() < Date.now() : false;
      const proj = Array.isArray(item.projects) ? item.projects[0] : item.projects;
      const title = proj?.title || 'Untitled export';
      const isCompleted = item.status === 'completed' && !expired;

      return {
        id: item.id,
        projectId: item.project_id,
        title,
        createdAt: item.created_at,
        status: item.status,
        downloadUrl: isCompleted ? `/api/exports/${item.id}/download` : null,
        source: 'exports_table',
      };
    });

    items = mergeExportsAndProjects(exportsItems, projectItems);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-4xl font-bold">My exports</h1>
          <p className="mt-1 text-sm text-zinc-400">Your latest rendered video exports.</p>
        </div>

        {userFacingError && (
          <div className="flex items-center gap-3 p-4 bg-rose-950/70 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold">{userFacingError}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-16 text-center">
            <Film className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-zinc-400 text-sm">No video exports found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.source}-${item.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-5 hover:border-white/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white text-sm">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleString()} · Status: <span className="capitalize text-zinc-300">{item.status}</span>
                  </p>
                </div>

                {item.downloadUrl ? (
                  <a
                    href={item.downloadUrl}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download MP4
                  </a>
                ) : (
                  <span className="text-xs text-zinc-500 capitalize bg-zinc-900 border border-white/5 px-2.5 py-1 rounded-md">
                    {item.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
