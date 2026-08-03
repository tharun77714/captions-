'use client';

import { useState, useRef, useCallback } from 'react';
import { renderMediaOnWeb, canRenderMediaOnWeb } from '@remotion/web-renderer';
import { CaptionComposition } from '@/remotion/CaptionComposition';
import type { Segment } from '@/store/editor-store';
import type { SubtitleStyleV3 } from '@/lib/subtitle-schema-v3';
import type { CaptionBlock } from '@/lib/caption-composition';

export type ExportPhase = 'idle' | 'preparing' | 'rendering' | 'uploading' | 'done' | 'failed' | 'cancelled';

interface StartExportOptions {
  projectId: string;
  videoUrl: string;
  durationSeconds: number;
  segments: Segment[];
  subtitleStyle: SubtitleStyleV3;
  subtitleMode: 'original' | 'transliterated' | 'translated';
  useCompositionRenderer: boolean;
  computedBlocks: CaptionBlock[];
  width: number;
  height: number;
  fps: number;
}

export function useRemotionExport() {
  const [phase, setPhase] = useState<ExportPhase>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeExportIdRef = useRef<string | null>(null);
  const finalizedExportRef = useRef(false);

  const cancelServerExport = useCallback(async (exportId: string | null) => {
    if (!exportId || finalizedExportRef.current) return;
    await fetch('/api/export/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportId }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const cancel = useCallback(() => {
    const exportId = activeExportIdRef.current;
    if (abortControllerRef.current) {
      console.log('[useRemotionExport] Aborting render/upload sequence...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setPhase('cancelled');
      setProgress(0);
    }
    activeExportIdRef.current = null;
    void cancelServerExport(exportId);
  }, [cancelServerExport]);

  const startExport = useCallback(async (options: StartExportOptions) => {
    const {
      projectId,
      videoUrl,
      durationSeconds,
      segments,
      subtitleStyle,
      subtitleMode,
      useCompositionRenderer,
      computedBlocks,
      width,
      height,
      fps,
    } = options;

    setPhase('preparing');
    setProgress(0);
    setError(null);
    setDownloadUrl(null);
    activeExportIdRef.current = null;
    finalizedExportRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Validate duration. If missing or invalid, halt rendering
      if (!durationSeconds || durationSeconds <= 0) {
        throw new Error('Export aborted: Duration is invalid or unavailable. Wait for video to load metadata.');
      }

      // 2. Reserve one export and create a durable export-library record before rendering.
      const authorizeResponse = await fetch('/api/export/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
        signal: controller.signal,
      });
      if (!authorizeResponse.ok) {
        const authorizeErr = await authorizeResponse.json().catch(() => ({}));
        throw new Error(authorizeErr.error || `Export authorization failed with status ${authorizeResponse.status}`);
      }
      const authorization = await authorizeResponse.json() as { exportId: string; watermark: boolean };
      if (!authorization.exportId) throw new Error('Export authorization did not return an export ID');
      activeExportIdRef.current = authorization.exportId;

      // 3. Perform browser codec encoding checks using canRenderMediaOnWeb
      console.log('[useRemotionExport] Performing pre-flight encoding validation...');
      const capabilityCheck = await canRenderMediaOnWeb({
        width,
        height,
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
      });

      if (!capabilityCheck.canRender) {
        const issuesText = capabilityCheck.issues
          .map((issue) => `${issue.message} (${issue.type})`)
          .join(', ');
        throw new Error(`Browser environment does not support MP4 encoding: ${issuesText || 'WebCodecs unavailable'}`);
      }

      const durationInFrames = Math.max(30, Math.ceil(durationSeconds * fps));
      console.log('[useRemotionExport] Rendering media in-browser...', {
        dimensions: `${width}x${height}`,
        fps,
        durationInFrames,
      });

      setPhase('rendering');

      // 3. Render composition inside the browser
      const renderResult = await renderMediaOnWeb({
        composition: {
          id: 'CaptionComposition',
          component: CaptionComposition,
          fps,
          width,
          height,
          durationInFrames,
          defaultProps: {
            projectId,
            videoUrl,
            fps,
            durationInFrames,
            dimensions: { width, height },
            segments,
            subtitleStyle,
            subtitleMode,
            useCompositionRenderer,
            computedBlocks,
            watermark: authorization.watermark,
            exportId: authorization.exportId,
          },
        },
        inputProps: {
          projectId,
          videoUrl,
          fps,
          durationInFrames,
          dimensions: { width, height },
          segments,
          subtitleStyle,
          subtitleMode,
          useCompositionRenderer,
          computedBlocks,
          watermark: authorization.watermark,
          exportId: authorization.exportId,
        },
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
        licenseKey: 'free-license',
        signal: controller.signal,
        onProgress: (prog) => {
          // Rendering progress mapped to 0-80% of total export
          const percent = Math.round(prog.progress * 80);
          setProgress(percent);
        },
      });

      if (controller.signal.aborted) {
        throw new Error('Export cancelled by user');
      }

      // 4. Fetch resulting Blob from local browser memory
      setPhase('uploading');
      setProgress(80);
      const videoBlob = await renderResult.getBlob();

      if (controller.signal.aborted) {
        throw new Error('Export cancelled by user');
      }

      // 5. Request presigned R2 PUT URL from Next.js server ONLY after rendering is complete
      console.log('[useRemotionExport] Requesting presigned storage signature...');
      const initResponse = await fetch('/api/export/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          exportId: authorization.exportId,
          contentType: 'video/mp4',
        }),
        signal: controller.signal,
      });

      if (!initResponse.ok) {
        const initErr = await initResponse.json().catch(() => ({}));
        throw new Error(initErr.error || `Initialization failed with status ${initResponse.status}`);
      }

      const { url: presignedPutUrl } = await initResponse.json();
      if (!presignedPutUrl) {
        throw new Error('Server did not return a valid upload signature URL');
      }

      console.log('[useRemotionExport] Uploading MP4 blob directly to Cloudflare R2 bucket...', {
        blobSize: videoBlob.size,
      });

      // 6. Direct PUT upload from browser to R2 using the presigned URL
      // Upload is mapped to 80-95% progress
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedPutUrl, true);
        xhr.setRequestHeader('Content-Type', 'video/mp4');

        controller.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Export cancelled by user'));
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPercent = event.loaded / event.total;
            // Scale 80% to 95%
            const currentProgress = 80 + Math.round(uploadPercent * 15);
            setProgress(currentProgress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage server rejected the upload with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network failure uploading direct to storage'));
        };

        xhr.send(videoBlob);
      });

      await uploadPromise;
      setProgress(95);

      if (controller.signal.aborted) {
        throw new Error('Export cancelled by user');
      }

      console.log('[useRemotionExport] Storage write validated. Finalizing completion on DB...');

      // 7. Complete export lifecycle to save state in projects table and retrieve short-lived download url
      const completeResponse = await fetch('/api/export/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, exportId: authorization.exportId }),
        signal: controller.signal,
      });

      if (!completeResponse.ok) {
        const completeErr = await completeResponse.json().catch(() => ({}));
        throw new Error(completeErr.error || `Database update failed with status ${completeResponse.status}`);
      }

      const completeResult = await completeResponse.json();
      setProgress(100);
      setDownloadUrl(completeResult.url);
      setPhase('done');
      finalizedExportRef.current = true;
      activeExportIdRef.current = null;
      console.log('[useRemotionExport] Direct storage export successfully completed!', completeResult);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected failure occurred during rendering.';
      if (controller.signal.aborted || message === 'Export cancelled by user') {
        console.log('[useRemotionExport] Active job cancelled.');
        await cancelServerExport(activeExportIdRef.current);
        activeExportIdRef.current = null;
        setPhase('cancelled');
      } else {
        console.error('[useRemotionExport] Export run failure:', err);
        await cancelServerExport(activeExportIdRef.current);
        activeExportIdRef.current = null;
        setError(message);
        setPhase('failed');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [cancelServerExport]);

  return {
    phase,
    progress,
    error,
    downloadUrl,
    startExport,
    cancel,
  };
}
