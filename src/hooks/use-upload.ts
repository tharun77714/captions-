import { useCallback, useRef } from 'react';
import { useUploadStore } from '@/store/upload-store';
import { MAX_UPLOAD_BYTES, getVideoUploadDescriptor } from '@/lib/upload-policy';

async function readApiError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Keep the fallback when the server did not return JSON.
  }
  return fallback;
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const timeout = window.setTimeout(() => finish(new Error('Timed out while reading video metadata')), 15_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (error?: Error) => {
      const duration = video.duration;
      cleanup();
      if (error) reject(error);
      else if (Number.isFinite(duration) && duration > 0) resolve(Math.round(duration * 1000));
      else reject(new Error('Could not read the video duration'));
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => finish();
    video.onerror = () => finish(new Error('This video cannot be read by the browser'));
    video.src = objectUrl;
  });
}

export function useUpload() {
  const { setStatus, setProgress, setError, setProjectId } = useUploadStore();
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const uploadFile = useCallback(async (file: File) => {
    cancelledRef.current = false;

    try {
      setError(null);
      setProjectId(null);

      const descriptor = getVideoUploadDescriptor(file.name, file.type);
      if (!descriptor) throw new Error('Unsupported video. Upload an MP4, MOV, or WEBM file.');
      if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
        throw new Error('Video must be larger than 0 bytes and no larger than 500 MB.');
      }

      setStatus('uploading');
      setProgress(0);
      const durationMs = await readVideoDuration(file);
      if (cancelledRef.current) return;

      controllerRef.current = new AbortController();

      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: descriptor.contentType, fileSize: file.size }),
        signal: controllerRef.current.signal,
      });

      if (!initRes.ok) throw new Error(await readApiError(initRes, 'Failed to initialize upload'));
      const { url, key, projectId } = await initRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', descriptor.contentType);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}. Please retry.`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
        xhr.send(file);
      });
      xhrRef.current = null;

      setStatus('processing');

      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: file.name,
          s3Key: key,
          sourceLanguage: useUploadStore.getState().sourceLanguage,
          durationMs,
          fileSize: file.size,
          contentType: descriptor.contentType,
        }),
        signal: controllerRef.current.signal,
      });

      if (!projectRes.ok) throw new Error(await readApiError(projectRes, 'Failed to start transcription'));
      const { projectId: createdProjectId } = await projectRes.json();

      setProjectId(createdProjectId);
      setStatus('success');
      controllerRef.current = null;
    } catch (error: unknown) {
      if (cancelledRef.current || (error instanceof DOMException && error.name === 'AbortError')) {
        setStatus('idle');
        setProgress(0);
        return;
      }

      console.error(error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      controllerRef.current = null;
      xhrRef.current = null;
    }
  }, [setStatus, setProgress, setError, setProjectId]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    controllerRef.current?.abort();
    xhrRef.current?.abort();
    controllerRef.current = null;
    xhrRef.current = null;
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, [setStatus, setProgress, setError]);

  return { uploadFile, cancelUpload };
}
