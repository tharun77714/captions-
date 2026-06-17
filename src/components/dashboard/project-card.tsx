'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ProjectCard({ project }: { project: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group flex flex-col bg-zinc-900/50 border border-white/10 rounded-xl hover:bg-zinc-800/50 transition-all duration-300 hover:border-violet-500/50 overflow-hidden relative"
      onMouseEnter={() => {
        setIsHovered(true);
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
    >
      {/* Video Preview Background */}
      {project.media_url && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isHovered ? 'opacity-40' : 'opacity-0'}`}>
          <video
            ref={videoRef}
            src={project.media_url}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col p-5 h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-medium truncate pr-4 group-hover:text-violet-400 transition-colors">
            {project.title || 'Untitled Project'}
          </h3>
          <ProjectStatusBadge status={project.status} />
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-zinc-500">
          <span>
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }).format(new Date(project.created_at))}
          </span>
          {project.language && (
            <span className="uppercase px-2 py-1 bg-zinc-800 rounded-md">
              {project.language}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return (
        <span className="flex items-center px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 rounded-full">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ready
        </span>
      );
    case 'transcribing':
      return (
        <span className="flex items-center px-2 py-1 text-xs font-medium text-blue-400 bg-blue-400/10 rounded-full">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </span>
      );
    case 'queued':
      return (
        <span className="flex items-center px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-400/10 rounded-full">
          <Clock className="w-3 h-3 mr-1" />
          Queued
        </span>
      );
    case 'failed':
      return (
        <span className="flex items-center px-2 py-1 text-xs font-medium text-red-400 bg-red-400/10 rounded-full">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    default:
      return (
        <span className="flex items-center px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-400/10 rounded-full">
          {status}
        </span>
      );
  }
}
