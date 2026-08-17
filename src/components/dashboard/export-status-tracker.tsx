'use client';

import React, { useEffect, useState } from 'react';
import { Download, Video, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ExportStatusTrackerProps {
  projectId: string;
  initialStatus: string;
}

export function ExportStatusTracker({ projectId, initialStatus }: ExportStatusTrackerProps) {
  const [exportStatus, setExportStatus] = useState<string>(initialStatus);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setExportStatus(data.export_status);

          if (data.export_status === 'completed') {
            try {
              const dlRes = await fetch(`/api/projects/${projectId}/download`);
              if (dlRes.ok) {
                const dlData = await dlRes.json();
                setDownloadUrl(dlData.url);
              }
            } catch (dlErr) {
              console.error('Download fetch error:', dlErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch project export status:', err);
      }
    };

    checkStatus();

    // Poll only if status is completed or none to check updates, capped at 3 attempts
    let pollCount = 0;
    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > 3) {
        clearInterval(interval);
        return;
      }
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `vidyut_export_${projectId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (exportStatus === 'none') return null;

  const isInterrupted = exportStatus === 'rendering' || exportStatus === 'queued';
  const isCompleted = exportStatus === 'completed';

  return (
    <div className="mt-6 p-5 border border-white/10 bg-zinc-900/50 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <Video className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          )}
          <div>
            <h3 className="text-sm font-medium text-white">Video Export Status</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isCompleted ? (
                'Export finished successfully.'
              ) : isInterrupted ? (
                'Export interrupted — browser rendering cannot continue outside the editor tab. Reopen editor and retry.'
              ) : (
                'Export failed. Please try again from the editor.'
              )}
            </p>
          </div>
        </div>

        {isCompleted && downloadUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/10 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Final Video
          </button>
        )}

        {isInterrupted && (
          <Link
            href={`/dashboard/projects/${projectId}/editor`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reopen Editor & Retry
          </Link>
        )}
      </div>
    </div>
  );
}
