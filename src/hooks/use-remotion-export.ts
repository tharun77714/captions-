'use client';

import { useState, useRef, useCallback } from 'react';
import { renderMediaOnWeb, canRenderMediaOnWeb } from '@remotion/web-renderer';
import { CaptionComposition } from '@/remotion/CaptionComposition';
import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';

export type ExportPhase = 'idle' | 'preparing' | 'rendering' | 'uploading' | 'done' | 'failed' | 'cancelled';

interface StartExportOptions {
  projectId: string;
  videoUrl: string;
  durationSeconds: number;
  segments: Segment[];
  subtitleStyle: SubtitleStyleV3;
  subtitleMode: 'original' | 'transliterated' | 'translated';
}

export function useRemotionExport() {
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[useRemotionExport] Aborting render job...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setPhase('cancelled');
      setProgress(0);
    }
  }, []);

  const startExport = useCallback(async (options: StartExportOptions) => {
    const { projectId, videoUrl, durationSeconds, segments, subtitleStyle, subtitleMode } = options;

    setPhase('preparing');
    setProgress(0);
    setError(null);
    setDownloadUrl(null);

    // Create a new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Browser capability checks using canRenderMediaOnWeb
      console.log('[useRemotionExport] Checking browser WebCodecs capabilities...');
      const check = await canRenderMediaOnWeb({
        width: 1080,
        height: 1920,
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
      });

      if (!check.canRender) {
        const issueMsgs = check.issues.map((i) => `${i.message} (${i.type})`).join(', ');
        throw new Error(`Browser codec encoding check failed: ${issueMsgs || 'WebCodecs unavailable'}`);
      }

      // 2. Validate input variables
      if (!videoUrl) {
        throw new Error('Video source URL is missing');
      }

      const fps = 30;
      const durationInFrames = Math.max(30, Math.ceil(durationSeconds * fps));

      console.log('[useRemotionExport] Initializing renderMediaOnWeb...', {
        durationSeconds,
        durationInFrames,
        videoUrl,
      });

      setPhase('rendering');

      // 3. Render composition in-browser
      const renderResult = await renderMediaOnWeb({
        composition: {
          id: 'CaptionComposition',
          component: CaptionComposition as any,
          fps,
          width: 1080,
          height: 1920,
          durationInFrames,
          defaultProps: {
            projectId,
            videoUrl,
            fps,
            durationInFrames,
            dimensions: { width: 1080, height: 1920 },
            segments,
            subtitleStyle,
            subtitleMode,
          }
        } as any,
        inputProps: {
          projectId,
          videoUrl,
          fps,
          durationInFrames,
          dimensions: { width: 1080, height: 1920 },
          segments,
          subtitleStyle,
          subtitleMode,
        },
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
        licenseKey: 'free-license',
        signal: controller.signal,
        onProgress: (prog) => {
          // Remotion progress spans 0 to 1
          // Rendering is scaled to 0-90% of total export progress
          const percent = Math.round(prog.progress * 90);
          setProgress(percent);
        },
      });

      if (controller.signal.aborted) {
        throw new Error('Render aborted by user');
      }

      // 4. Retrieve Blob from local Remotion renderer
      setPhase('uploading');
      setProgress(90);
      console.log('[useRemotionExport] Render complete, compiling video blob...');
      const videoBlob = await renderResult.getBlob();

      if (controller.signal.aborted) {
        throw new Error('Upload aborted by user');
      }

      console.log('[useRemotionExport] Uploading MP4 blob to server storage...', {
        blobSize: videoBlob.size,
      });

      // 5. Send file payload via FormData to the API upload endpoint
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('file', videoBlob, 'export.mp4');

      const uploadResponse = await fetch('/api/export/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!uploadResponse.ok) {
        const errJson = await uploadResponse.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload request failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      setProgress(100);
      setDownloadUrl(uploadResult.url);
      setPhase('done');
      console.log('[useRemotionExport] Export sequence finished successfully!', uploadResult);

    } catch (err: any) {
      if (controller.signal.aborted || err.message === 'Render aborted by user' || err.message === 'Upload aborted by user') {
        console.log('[useRemotionExport] Export job was explicitly cancelled.');
        setPhase('cancelled');
      } else {
        console.error('[useRemotionExport] Render error:', err);
        setError(err.message || 'An unexpected error occurred during rendering.');
        setPhase('failed');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  return {
    phase,
    progress,
    error,
    downloadUrl,
    startExport,
    cancel,
  };
}
