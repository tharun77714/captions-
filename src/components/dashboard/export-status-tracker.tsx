'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Download, Loader2, Video, AlertCircle } from 'lucide-react';

export type ExportStatus = 'none' | 'queued' | 'starting' | 'planning' | 'rendering' | 'encoding' | 'mixing' | 'muxing' | 'uploading' | 'completed' | 'failed' | 'cancelled';

interface ExportStatusTrackerProps {
  projectId: string;
  initialStatus: string;
}

export function ExportStatusTracker({ projectId, initialStatus }: ExportStatusTrackerProps) {
  const [exportStatus, setExportStatus] = useState<string>(initialStatus);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const startSSEStream = React.useCallback((jobId: string) => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const sse = new EventSource(`/api/export/${jobId}/progress`);
    sseRef.current = sse;

    sse.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        setExportStatus(data.status);
        setProgress(data.progress);
        setStage(data.stage);
        setErrorMsg(data.error || null);

        if (data.status === 'completed') {
          sse.close();
          try {
            const dlRes = await fetch(`/api/projects/${projectId}/download`);
            if (dlRes.ok) {
              const dlData = await dlRes.json();
              setDownloadUrl(dlData.url);
            }
          } catch (dlErr) {
            console.error('Failed to get signed download link:', dlErr);
          }
        } else if (['failed', 'cancelled'].includes(data.status)) {
          sse.close();
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    sse.onerror = () => {
      sse.close();
    };
  }, [projectId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isJobActive = (status: string) => 
      ['queued', 'starting', 'planning', 'rendering', 'encoding', 'mixing', 'muxing', 'uploading'].includes(status);

    const checkJobStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setExportStatus(data.export_status);
          setProgress(data.progress || 0);
          setStage(data.stage || '');
          
          if (data.export_status === 'completed') {
            try {
              const dlRes = await fetch(`/api/projects/${projectId}/download`);
              if (dlRes.ok) {
                const dlData = await dlRes.json();
                setDownloadUrl(dlData.url);
              }
            } catch (dlErr) {
              console.error('Download error:', dlErr);
            }
          }

          if (data.job_id && isJobActive(data.export_status)) {
            startSSEStream(data.job_id);
            clearInterval(interval);
          } else if (!isJobActive(data.export_status)) {
            clearInterval(interval);
          }
        }
      } catch {}
    };

    // First fetch immediately
    checkJobStatus();

    // Fallback polling until we successfully claim a jobId and open SSE
    interval = setInterval(checkJobStatus, 4000);

    return () => {
      clearInterval(interval);
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [projectId, startSSEStream]);

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
  const isRunning = ['queued', 'starting', 'planning', 'rendering', 'encoding', 'mixing', 'muxing', 'uploading'].includes(exportStatus);

  return (
    <div className="mt-6 p-5 border border-white/10 bg-zinc-900/50 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isRunning ? (
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          ) : exportStatus === 'completed' ? (
            <Video className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          )}
          <div>
            <h3 className="text-sm font-medium text-white">Video Export Status</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isRunning ? (stage || 'Rendering subtitles into video...') :
               exportStatus === 'completed' ? 'Export finished successfully.' :
               (errorMsg || 'Export failed. Please try again from the editor.')}
            </p>
          </div>
        </div>

        {exportStatus === 'completed' && downloadUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/10 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Final Video
          </button>
        )}
      </div>

      {isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
            <span>Export progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
