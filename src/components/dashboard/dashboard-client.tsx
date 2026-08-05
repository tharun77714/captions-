'use client';

import React, { useState, useMemo } from 'react';
import { DragAndDrop } from '@/components/upload/drag-and-drop';
import { ProjectCard } from '@/components/dashboard/project-card';
import { Video, Layers, CheckCircle2, Loader2, Search } from 'lucide-react';

export function DashboardClient({ projects, user }: { projects: any[]; user: { email: string } }) {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('All'); // 'All', 'Auto', 'te', etc.

  const totalProjects = projects.length;
  const readyProjects = projects.filter(p => p.status === 'ready').length;
  const processingProjects = projects.filter(p => p.status === 'transcribing' || p.status === 'queued').length;

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = p.title ? p.title.toLowerCase().includes(search.toLowerCase()) : false;
      const matchSearchEmptyTitle = !p.title && 'untitled studio project'.includes(search.toLowerCase());
      
      const matchSearchFinal = search.trim() === '' || matchSearch || matchSearchEmptyTitle;
      
      const matchLang = language === 'All' || (p.language || 'Auto').toLowerCase() === language.toLowerCase();
      
      return matchSearchFinal && matchLang;
    });
  }, [projects, search, language]);

  return (
    <div className="flex flex-col w-full">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-[11px] tracking-wider uppercase mb-1">Total Projects</div>
            <div className="text-2xl font-semibold text-zinc-100">{totalProjects}</div>
          </div>
          <Layers className="text-zinc-600 w-8 h-8" />
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-[11px] tracking-wider uppercase mb-1">Ready</div>
            <div className="text-2xl font-semibold text-zinc-100">{readyProjects}</div>
          </div>
          <CheckCircle2 className="text-zinc-600 w-8 h-8" />
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-500 text-[11px] tracking-wider uppercase mb-1">Processing</div>
            <div className="text-2xl font-semibold text-zinc-100">{processingProjects}</div>
          </div>
          <Loader2 className="text-zinc-600 w-8 h-8" />
        </div>
      </div>

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <h2 className="text-lg font-semibold tracking-tight text-zinc-200">Recent Projects</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:border-zinc-500 w-full sm:w-48 transition-colors"
              />
            </div>
            
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-500 transition-colors"
            >
              <option value="All">All Languages</option>
              <option value="Auto">Auto</option>
              <option value="te">te</option>
              <option value="hi">hi</option>
              <option value="ta">ta</option>
              <option value="kn">kn</option>
              <option value="ml">ml</option>
              <option value="en">en</option>
            </select>
            
            <span className="text-xs font-mono text-zinc-500 ml-1">
              {filteredProjects.length} of {totalProjects} projects
            </span>
          </div>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-zinc-800/80 rounded-xl bg-zinc-900/20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <Video className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No projects in your workspace yet</p>
            <p className="text-xs text-zinc-500 mt-1">Upload a media file above to initiate your first transcription.</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-zinc-800/80 rounded-xl bg-zinc-900/20 text-center px-4">
            <Search className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No projects found</p>
            <p className="text-xs text-zinc-500 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
