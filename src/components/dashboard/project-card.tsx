'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, AlertCircle, Loader2, MoreVertical, Pencil, Trash2, Film } from 'lucide-react';

export function ProjectCard({ project }: { project: any }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.title || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    if (project.media_url && !videoUrl) {
      const fetchUrl = async () => {
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
      };
      fetchUrl();
    }
  }, [project.media_url, videoUrl]);

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === project.title) {
      setIsRenaming(false);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setIsRenaming(false);
      }
    } catch (e) {
      console.error(e);
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project?')) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setIsDeleted(true);
        }
      } catch (e) {
        console.error(e);
      }
      setIsDeleting(false);
    }
  };

  if (isDeleted) return null;

  return (
    <div
      className="group flex flex-col bg-zinc-900 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-all duration-300 overflow-hidden relative shadow-sm cursor-pointer min-h-[200px] hover:shadow-xl"
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
      onClick={(e) => {
        // Navigate if not clicking on menu/input
        const target = e.target as HTMLElement;
        if (!target.closest('.menu-container') && !isRenaming) {
          router.push(`/dashboard/projects/${project.id}`);
        }
      }}
    >
      {/* Full Card Video Background */}
      {project.media_url ? (
        <>
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              preload="metadata"
              playsInline
              loop
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                isHovered ? 'scale-105 filter-none' : 'scale-100 brightness-[0.65]'
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
          )}
          {/* Subtle Dark Gradient Overlay for Text Visibility */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/20 transition-opacity duration-300 ${
              isHovered ? 'opacity-70' : 'opacity-85'
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
          <Film className="text-zinc-700 w-8 h-8" />
        </div>
      )}

      {/* Card Content Layer */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5 min-h-[200px]">
        {/* Top Row: Status Badge + Menu */}
        <div className="flex items-center justify-between menu-container">
          <ProjectStatusBadge status={project.status} />

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 hover:bg-zinc-800/80 bg-zinc-950/60 backdrop-blur-md rounded-md text-zinc-300 hover:text-white transition-colors border border-white/5"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex items-center gap-2"
                  >
                    <Pencil className="w-3 h-3" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row: Title + Language + Date */}
        <div className="mt-8">
          {isRenaming ? (
            <div className="menu-container w-full mb-2">
              <input
                autoFocus
                type="text"
                className="w-full bg-zinc-950/90 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-100 outline-none focus:border-violet-500"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setRenameValue(project.title || '');
                    setIsRenaming(false);
                  }
                }}
              />
            </div>
          ) : (
            <h3 className="font-semibold text-base text-white truncate drop-shadow-sm mb-2 group-hover:text-violet-200 transition-colors">
              {project.title || 'Untitled Studio Project'}
            </h3>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>
              {new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }).format(new Date(project.created_at))}
            </span>
            {project.language && (
              <span className="uppercase px-2 py-0.5 bg-zinc-950/80 text-zinc-300 rounded text-[10px] font-mono border border-zinc-700/50">
                {project.language}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
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
