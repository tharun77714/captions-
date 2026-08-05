import React from 'react';
import Link from 'next/link';
import { DragAndDrop } from '@/components/upload/drag-and-drop';
import { createClient } from '@/lib/supabase/server';
import { Video, Layers, Plus } from 'lucide-react';
import { ProjectCard } from '@/components/dashboard/project-card';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-zinc-800 selection:text-zinc-100 antialiased font-sans">
      <header className="border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between text-sm">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center shadow-sm">
              <span className="text-[#09090b] font-bold text-xs">V</span>
            </div>
            <span className="font-semibold tracking-tight text-base text-zinc-100">Vidyut Studio</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-zinc-500 border-r border-zinc-800 pr-3 mr-1 truncate max-w-[200px]">
              {user.email}
            </span>
            <Link 
              href="/dashboard/exports" 
              className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Exports
            </Link>
            <Link 
              href="/dashboard/billing" 
              className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Plan
            </Link>
            <form action="/auth/signout" method="post">
              <button 
                type="submit" 
                className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl px-6 py-16 mx-auto">
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl text-zinc-100">
            Studio Workspace
          </h1>
          <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-md font-normal leading-relaxed">
            Upload your raw video footage. Our engine extracts clean dialogue and creates synchronised captions.
          </p>
          
          <div className="mt-10 w-full">
            <DragAndDrop />
          </div>
        </div>

        {/* Recent Projects Section */}
        <div className="flex flex-col w-full pt-8 border-t border-zinc-800/60">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h2 className="text-lg font-semibold tracking-tight text-zinc-200">Recent Projects</h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              {projects?.length || 0} {(projects?.length === 1) ? 'project' : 'projects'}
            </span>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-zinc-800/80 rounded-xl bg-zinc-900/20 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Video className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-sm font-medium text-zinc-300">No projects in your workspace yet</p>
              <p className="text-xs text-zinc-500 mt-1">Upload a media file above to initiate your first transcription.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
