"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileVideo, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUploadStore } from '@/store/upload-store';
import { useUpload } from '@/hooks/use-upload';
import { cn } from '@/lib/utils';

export function DragAndDrop() {
  const { status, progress, error, projectId, sourceLanguage, setSourceLanguage } = useUploadStore();
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

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center w-full max-w-2xl p-12 mx-auto mt-10 transition-all duration-200 border-2 border-dashed rounded-xl cursor-pointer',
        isDragActive
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800',
        (status === 'uploading' || status === 'processing') && 'pointer-events-none opacity-80'
      )}
    >
      <input {...getInputProps()} />

      {(status === 'idle' || status === 'error') && (
        <>
          <div className="p-4 mb-4 rounded-full bg-zinc-800">
            <UploadCloud className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Upload your video</h3>
          <p className="mt-2 text-sm text-zinc-400 text-center">
            Drag and drop your file here, or click to browse.
          </p>
          
          <div className="mt-6 flex flex-col items-center z-10 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-semibold">Video Language</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2.5"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
            >
              <option value="auto">Auto Detect (Default)</option>
              <option value="te">Telugu</option>
              <option value="ta">Tamil</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex gap-2 mt-6 text-xs text-zinc-500">
            <span>MP4, MOV, WEBM</span>
            <span>•</span>
            <span>Up to 500MB</span>
          </div>
        </>
      )}

      {(status === 'uploading' || status === 'processing') && (
        <div className="flex flex-col items-center w-full max-w-sm">
          <FileVideo className="w-12 h-12 mb-6 text-violet-500 animate-pulse" />
          
          <div className="w-full h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full transition-all duration-300 bg-violet-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between w-full mt-3 text-sm">
            <span className="font-medium text-zinc-300">
              {status === 'uploading' ? 'Uploading...' : 'Finalizing...'}
            </span>
            <span className="text-zinc-500">{progress}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute flex items-center gap-2 p-3 text-sm text-red-500 rounded-lg -bottom-16 bg-red-500/10">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
