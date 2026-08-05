import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Clock, Download, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: projects }, { data: usage }, { data: exports }] = await Promise.all([
    supabase.from('projects').select('id, status, created_at, language').eq('user_id', user.id),
    supabase.from('usage_events').select('resource, amount, created_at').eq('user_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('exports').select('id, status, file_size, created_at').eq('user_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const totalProjects = projects?.length || 0;
  const readyProjects = projects?.filter(p => p.status === 'ready').length || 0;
  const totalTranscriptionSeconds = (usage || []).filter(u => u.resource === 'transcription').reduce((sum, u) => sum + u.amount, 0);
  const totalExports = exports?.length || 0;
  const totalExportBytes = (exports || []).filter(e => e.status === 'completed').reduce((sum, e) => sum + (e.file_size || 0), 0);

  // Projects by language
  const byLanguage: Record<string, number> = {};
  (projects || []).forEach(p => {
    if (p.language) byLanguage[p.language] = (byLanguage[p.language] || 0) + 1;
  });

  // Projects created in last 30 days by day (last 7 days for a mini chart)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const projectsByDay = last7Days.map(day => ({
    day: day.slice(5), // MM-DD
    count: (projects || []).filter(p => p.created_at.startsWith(day)).length,
  }));

  const maxDayCount = Math.max(...projectsByDay.map(d => d.count), 1);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 antialiased font-sans">
      <header className="border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center"><span className="text-[#09090b] font-bold text-xs">V</span></div>
            <span className="font-semibold text-sm text-zinc-300">Analytics</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Last 30 days</span>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 mt-1">Usage Analytics</h1>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Projects', value: totalProjects, icon: Video },
            { label: 'Ready Projects', value: readyProjects, icon: TrendingUp },
            { label: 'Minutes Transcribed', value: Math.ceil(totalTranscriptionSeconds / 60), icon: Clock },
            { label: 'Exports (30d)', value: totalExports, icon: Download },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
                <Icon className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Projects Activity (last 7 days bar chart) */}
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20">
            <h3 className="text-sm font-semibold text-zinc-300 mb-5">Projects — Last 7 Days</h3>
            <div className="flex items-end gap-2 h-24">
              {projectsByDay.map(({ day, count }) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-zinc-700/60 rounded-sm transition-all"
                    style={{ height: `${(count / maxDayCount) * 80}px`, minHeight: count > 0 ? '4px' : '2px', backgroundColor: count > 0 ? '#6d28d9' : undefined }}
                  />
                  <span className="text-[9px] font-mono text-zinc-600">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Language Breakdown */}
          <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20">
            <h3 className="text-sm font-semibold text-zinc-300 mb-5">Languages Used</h3>
            {Object.keys(byLanguage).length === 0 ? (
              <p className="text-xs text-zinc-600">No language data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byLanguage).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-400 uppercase w-8">{lang}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600 rounded-full" style={{ width: `${(count / totalProjects) * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-zinc-800/60">
              <p className="text-[11px] text-zinc-600">
                Storage used: {totalExportBytes > 0 ? `${(totalExportBytes / 1024 / 1024).toFixed(1)} MB` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
