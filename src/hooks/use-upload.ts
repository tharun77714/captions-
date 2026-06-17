import { useCallback } from 'react';
import { useUploadStore } from '@/store/upload-store';

export function useUpload() {
  const { setStatus, setProgress, setError, setProjectId } = useUploadStore();

  const uploadFile = useCallback(async (file: File) => {
    try {
      setStatus('uploading');
      setProgress(0);
      setError(null);

      // 1. Get Presigned URL
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!initRes.ok) throw new Error('Failed to initialize upload');
      const { url, key } = await initRes.json();

      // 2. Upload directly to R2 using XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setStatus('processing');

      // 3. Create Project in Database
      // Note: For Feature 001 testing without Auth, RLS might block this unless using Service Role.
      // Assuming the API route uses Service Role or we disable RLS locally for testing.
      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: file.name, 
          s3Key: key,
          sourceLanguage: useUploadStore.getState().sourceLanguage
        }),
      });

      if (!projectRes.ok) throw new Error('Failed to create project record');
      const { projectId } = await projectRes.json();

      setProjectId(projectId);
      setStatus('success');

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, [setStatus, setProgress, setError, setProjectId]);

  return { uploadFile };
}
