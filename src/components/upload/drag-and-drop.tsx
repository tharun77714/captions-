"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileVideo, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useUploadStore } from '@/store/upload-store';
import { useUpload } from '@/hooks/use-upload';
import { cn } from '@/lib/utils';

export function DragAndDrop() {
  const { status, progress, error, setError, projectId, sourceLanguage, setSourceLanguage } = useUploadStore();
  const { uploadFile } = useUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      if (fileRejections.length > 0) {
        setError('Unsupported file format. Please upload a valid MP4, MOV, or WEBM video.');
        return;
      }
      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0]);
      }
    },
    [uploadFile, setError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4', '.MP4'],
      'video/quicktime': ['.mov', '.MOV'],
      'video/webm': ['.webm', '.WEBM'],
    },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'processing',
  });

  // ── Upload Complete ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-green-500/50 bg-green-500/10 rounded-xl">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-white">Upload Complete</h3>
        <p className="text-zinc-400 mt-2">Project ID: {projectId}</p>
        <button
          onClick={() => window.location.href = `/dashboard/projects/${projectId}`}
          className="mt-6 px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
        >
          View Transcript
        </button>
      </div>
    );
  }

  // ── Uploading to R2 ──────────────────────────────────────────────
  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl p-12 mx-auto mt-10 border-2 border-dashed border-violet-500/40 bg-zinc-900 rounded-xl">
        <div className="p-4 mb-5 rounded-full bg-violet-500/10 border border-violet-500/20">
          <FileVideo className="w-10 h-10 text-violet-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">Uploading video…</h3>
        <p className="text-sm text-zinc-500 mb-8">Please keep this tab open</p>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <div className="w-full h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-sm text-zinc-400">Uploading…</span>
            <span className="text-sm font-semibold text-violet-400">{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing (transcription) ───────────────────────────────────
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl p-12 mx-auto mt-10 border-2 border-dashed border-violet-500/40 bg-zinc-900 rounded-xl">
        <div className="p-4 mb-5 rounded-full bg-violet-500/10 border border-violet-500/20">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">Processing…</h3>
        <p className="text-sm text-zinc-500">Transcribing your video with AI. This may take a minute.</p>

        {/* Indeterminate shimmer bar */}
        <div className="w-full max-w-sm mt-8">
          <div className="w-full h-2 overflow-hidden rounded-full bg-zinc-800 relative">
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-violet-500 animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Idle / Error — Dropzone ──────────────────────────────────────
  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center w-full max-w-2xl p-12 mx-auto mt-10 transition-all duration-200 border-2 border-dashed rounded-xl cursor-pointer',
        isDragActive
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800',
      )}
    >
      <input {...getInputProps()} />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 text-sm text-red-500 rounded-lg bg-red-500/10 border border-red-500/20 max-w-md text-center" onClick={(e) => e.stopPropagation()}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-4 mb-4 rounded-full bg-zinc-800">
        <UploadCloud className="w-8 h-8 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold text-white">Upload your video</h3>
      <p className="mt-2 text-sm text-zinc-400 text-center">
        Drag and drop your file here, or click to browse.
      </p>

      <div className="mt-6 flex flex-col items-center z-10 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">Video Language</label>
        <select
          className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2.5 cursor-pointer"
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
        >
          <option value="auto">Auto Detect</option>
          <option value="te">Telugu</option>
          <option value="hi">Hindi</option>
          <option value="ta">Tamil</option>
          <option value="kn">Kannada</option>
          <option value="ml">Malayalam</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="flex gap-2 mt-4 text-xs text-zinc-500">
        <span>MP4, MOV, WEBM</span>
        <span>•</span>
        <span>Up to 500MB</span>
      </div>
    </div>
  );
}
