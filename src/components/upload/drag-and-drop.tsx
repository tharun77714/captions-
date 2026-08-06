"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { UploadCloud, FileVideo, CheckCircle2, AlertCircle, Loader2, Sparkles, Globe, Mic } from 'lucide-react';
import { useUploadStore } from '@/store/upload-store';
import { useUpload } from '@/hooks/use-upload';
import { cn } from '@/lib/utils';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-policy';

export function DragAndDrop() {
  const { 
    status, 
    progress, 
    error, 
    setError, 
    projectId, 
    sourceLanguage, 
    setSourceLanguage,
    targetLanguage,
    setTargetLanguage,
    enableVoiceCloning,
    setEnableVoiceCloning
  } = useUploadStore();
  const { uploadFile, cancelUpload } = useUpload();
  const [lastFile, setLastFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);
      if (fileRejections.length > 0) {
        setError('Unsupported file format. Please upload a valid MP4, MOV, or WEBM video.');
        return;
      }
      if (acceptedFiles.length > 0) {
        setLastFile(acceptedFiles[0]);
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
    maxSize: MAX_UPLOAD_BYTES,
    disabled: status === 'uploading' || status === 'processing',
  });

  // ── Upload Complete ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-10 border border-emerald-500/30 bg-emerald-500/5 rounded-xl text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">Media imported successfully</h3>
        <p className="text-xs text-zinc-400 mt-1">Deepgram STT, LLM Translation & CosyVoice 2 dubbing pipeline initiated.</p>
        <button
          onClick={() => window.location.href = `/dashboard/projects/${projectId}`}
          className="mt-6 px-5 py-2 bg-zinc-100 text-[#09090b] font-medium text-xs rounded-md hover:bg-white transition-colors shadow-sm"
        >
          Open Studio Editor
        </button>
      </div>
    );
  }

  // ── Uploading to R2 ──────────────────────────────────────────────
  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl p-10 mx-auto border border-zinc-800/80 bg-zinc-900/30 rounded-xl">
        <div className="p-3 mb-4 rounded-full bg-zinc-800/80 border border-zinc-700/50">
          <FileVideo className="w-6 h-6 text-zinc-300" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Uploading media file…</h3>
        <p className="text-xs text-zinc-500 mb-6">Please keep this window open until transfer completes.</p>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="w-full h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 font-mono">
            <span className="text-xs text-zinc-500">Transferring</span>
            <span className="text-xs font-semibold text-zinc-300">{progress}%</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); cancelUpload(); }}
          className="mt-6 px-3.5 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-800 rounded-md hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors"
        >
          Cancel import
        </button>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl p-10 mx-auto border border-zinc-800/80 bg-zinc-900/30 rounded-xl">
        <div className="p-3 mb-4 rounded-full bg-violet-500/10 border border-violet-500/20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Deepgram STT & CosyVoice 2 Cloning…</h3>
        <p className="text-xs text-zinc-500 max-w-xs text-center leading-relaxed">
          Extracting audio, running Deepgram transcription, LLM translation, and synthesizing voice clone.
        </p>

        {/* Shimmer bar */}
        <div className="w-full max-w-xs mt-6">
          <div className="w-full h-1.5 overflow-hidden rounded-full bg-zinc-800 relative">
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-violet-500/80 animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Idle / Dropzone ──────────────────────────────────────
  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center w-full max-w-xl p-10 mx-auto transition-all duration-200 border border-dashed rounded-xl cursor-pointer',
        isDragActive
          ? 'border-violet-500/60 bg-violet-500/5'
          : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40',
      )}
    >
      <input {...getInputProps()} />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 text-xs text-rose-400 rounded-lg bg-rose-500/10 border border-rose-500/20 max-w-md text-center" onClick={(e) => e.stopPropagation()}>
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
          {lastFile && (
            <button
              type="button"
              className="ml-2 font-medium underline underline-offset-2 whitespace-nowrap"
              onClick={() => uploadFile(lastFile)}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="p-3 mb-4 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
        <UploadCloud className="w-6 h-6 text-zinc-400" />
      </div>
      <h3 className="text-base font-semibold text-zinc-200">Import media file</h3>
      <p className="mt-1.5 text-xs text-zinc-500 text-center max-w-sm leading-relaxed">
        Drag and drop your video file here, or click to select from your file system.
      </p>

      {/* Language & Voice Dubbing Configuration Panel */}
      <div className="mt-6 w-full max-w-md bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-4 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Source Language */}
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1 uppercase tracking-wider font-mono font-medium">
              <Globe className="w-3 h-3 text-zinc-400" />
              Source Language
            </label>
            <select
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md focus:ring-1 focus:ring-violet-500 focus:border-violet-500 block p-2 cursor-pointer transition-colors"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              <option value="auto">Auto Detect (Telugu, Hindi, etc.)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="ml">Malayalam (മലയാളം)</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Target Dubbing Language */}
          <div>
            <label className="text-[11px] text-violet-400 mb-1 flex items-center gap-1 uppercase tracking-wider font-mono font-medium">
              <Sparkles className="w-3 h-3 text-violet-400" />
              Dubbing Target Language
            </label>
            <select
              className="w-full bg-zinc-900 border border-violet-500/40 text-violet-200 text-xs rounded-md focus:ring-1 focus:ring-violet-500 focus:border-violet-500 block p-2 cursor-pointer transition-colors font-medium"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              <option value="en">English (US/UK)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="ja">Japanese (日本語)</option>
            </select>
          </div>
        </div>

        {/* Voice Cloning Mode Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-violet-400" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-zinc-200">CosyVoice 2 Cross-Lingual Cloning</span>
              <span className="text-[10px] text-zinc-500">Dub into target language preserving speaker's exact voice</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnableVoiceCloning(!enableVoiceCloning)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              enableVoiceCloning ? "bg-violet-600" : "bg-zinc-800"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                enableVoiceCloning ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 text-[11px] font-mono text-zinc-600">
        <span>MP4 · MOV · WEBM</span>
        <span>/</span>
        <span>MAX 500 MB</span>
      </div>
    </div>
  );
}
