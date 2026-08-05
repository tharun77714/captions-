'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ProjectCard({ project }: { project: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group flex flex-col bg-zinc-900/30 border border-zinc-800/80 rounded-xl hover:bg-zinc-900/60 transition-all duration-200 hover:border-zinc-700/80 overflow-hidden relative shadow-sm"
      onMouseEnter={async () => {
        setIsHovered(true);
        if (!videoUrl && project.media_url) {
          try {
            const res = await fetch('/api/video/url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: project.media_url }),
            });
            if (res.ok) {
              const { url } = await res.json();
              setVideoUrl(url);
            }
          } catch (e) {
            console.error('Failed to load video url', e);
          }
        }
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
        <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${isHovered ? 'opacity-30' : 'opacity-0'}`}>
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col p-5 h-full min-h-[140px]">
        <div className="flex items-start justify-between mb-4 gap-2">
          <h3 className="font-medium text-sm truncate group-hover:text-zinc-100 text-zinc-300 transition-colors">
            {project.title || 'Untitled Studio Project'}
          </h3>
          <ProjectStatusBadge status={project.status} />
        </div>
        <div className="mt-auto pt-3 border-t border-zinc-800/50 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }).format(new Date(project.created_at))}
          </span>
          {project.language && (
            <span className="uppercase px-2 py-0.5 bg-zinc-800/80 text-zinc-400 rounded text-[10px] font-mono border border-zinc-700/50">
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
        <span className="flex items-center px-2 py-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ready
        </span>
      );
    case 'transcribing':
      return (
        <span className="flex items-center px-2 py-0.5 text-[11px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md shrink-0">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center px-2 py-0.5 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md shrink-0">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </span>
      );
    default:
      return (
        <span className="flex items-center px-2 py-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 rounded-md shrink-0">
          <Clock className="w-3 h-3 mr-1" />
          Queued
        </span>
      );
  }
}
