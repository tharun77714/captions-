import React from 'react';
import { DragAndDrop } from '@/components/upload/drag-and-drop';
import { createClient } from '@/lib/supabase/server';
import { Video } from 'lucide-react';
import { ProjectCard } from '@/components/dashboard/project-card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
      <main className="container flex flex-col max-w-5xl px-6 py-16 mx-auto md:py-24">
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">
            Create your next project
          </h1>
          <p className="mt-4 text-lg text-zinc-400 max-w-lg">
            Upload your raw video. We&apos;ll automatically extract the audio and generate high-accuracy captions.
          </p>
          
          <div className="mt-10 w-full">
            <DragAndDrop />
          </div>
        </div>

        {/* Recent Projects Section */}
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Recent Projects</h2>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-white/10 rounded-2xl bg-zinc-950/50">
              <Video className="w-12 h-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400">No projects yet. Upload a video to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
