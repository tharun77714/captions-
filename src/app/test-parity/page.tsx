'use client';

import React, { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/editor/video-player';
import { useEditorStore } from '@/store/editor-store';
import { preloadFonts } from '@/lib/font-registry';
import { getAllUsedFonts, ensureV3 } from '@/lib/subtitle-schema-v3';
import testPayloads from '../../../parity_test_payloads.json';

type ReadyPhase = 'loading' | 'hydrating' | 'waiting' | 'ready' | 'error';
interface RenderReadyState {
  phase: ReadyPhase; error?: string; payloadInjected: boolean; zustandHydrated: boolean;
  fontsLoaded: boolean; videoReady: boolean; documentReady: boolean; requestedTime: number | null;
  requestedCommandId: number; renderedTime: number | null; renderedCommandId: number;
  timings: { hydrationMs: number | null; fontLoadingMs: number | null };
}
declare global {
  interface Window {
    __INITIAL_PAYLOAD__?: any; __EXPORT_MODE__?: boolean; __IS_READY_TO_RENDER__?: boolean;
    __RENDER_READY_STATE__?: RenderReadyState; SET_CURRENT_TIME?: (time: number) => number;
  }
}
const updateReadyState = (patch: Partial<RenderReadyState>) => {
  if (window.__RENDER_READY_STATE__) Object.assign(window.__RENDER_READY_STATE__, patch);
};
function waitForDocumentComplete(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
}
function waitForVideoReady(video: HTMLVideoElement | null): Promise<void> {
  if (!video || video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) return Promise.resolve();
  return new Promise((resolve) => {
    const cleanup = () => {
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => {
      cleanup();
      console.warn('Video failed to load, proceeding with render anyway.');
      resolve();
    };
    video.addEventListener('canplaythrough', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
    
    // 2-second safety timeout to avoid hanging on slow network or mock assets
    setTimeout(() => {
      cleanup();
      console.warn('Video load timed out (2s limit), proceeding with render.');
      resolve();
    }, 2000);
  });
}
/** Records a real React DOM commit without a timer or requestAnimationFrame. */
function RenderCommitSignal({ enabled }: { enabled: boolean }) {
  const currentTime = useEditorStore((state) => state.currentTime);
  const [commandId, setCommandId] = useState(0);
  useEffect(() => {
    const onCommand = (event: Event) => setCommandId((event as CustomEvent<{ commandId: number }>).detail.commandId);
    window.addEventListener('milestone2:set-current-time', onCommand);
    return () => window.removeEventListener('milestone2:set-current-time', onCommand);
  }, []);
  useLayoutEffect(() => {
    if (enabled) updateReadyState({ renderedTime: currentTime, renderedCommandId: commandId });
  }, [commandId, currentTime, enabled]);
  return <span id="render-commit-signal" aria-hidden="true" className="hidden" data-rendered-time={enabled ? currentTime : undefined} data-rendered-command-id={enabled ? commandId : undefined} />;
}
function ParityTestInner() {
  const id = useSearchParams().get('id');
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const payload = window.__INITIAL_PAYLOAD__ ?? (id ? (testPayloads as any[]).find((candidate) => candidate.project_id === id || candidate.project_id.startsWith(id)) : undefined);
      window.__IS_READY_TO_RENDER__ = false;
      window.__RENDER_READY_STATE__ = {
        phase: 'loading', payloadInjected: Boolean(window.__INITIAL_PAYLOAD__), zustandHydrated: false,
        fontsLoaded: false, videoReady: false, documentReady: false, requestedTime: null, requestedCommandId: 0,
        renderedTime: null, renderedCommandId: 0, timings: { hydrationMs: null, fontLoadingMs: null },
      };
      if (!payload) { updateReadyState({ phase: 'error', error: 'No render payload was supplied.' }); return; }
      try {
        const style = ensureV3(payload.style || payload.subtitleStyle);
        const segments = payload.segments || [];
        const words = segments.flatMap((segment: any) => segment.words || []);
        const store = useEditorStore.getState();
        const initialTime = 0;
        updateReadyState({ phase: 'hydrating' });
        const hydrationStartedAt = performance.now();
        store.setTranscriptData(segments, words);
        store.setSubtitleStyle(style);
        store.setVideoUrl(payload.backgroundVideo?.url || '');
        store.setCurrentTime(initialTime);
        store.setDuration(payload.backgroundVideo?.duration || 0);
        store.setActiveSegmentIndex(segments.findIndex((segment: any) => initialTime >= segment.start && initialTime <= segment.end));
        const state = useEditorStore.getState();
        if (state.segments.length !== segments.length || state.currentTime !== initialTime || state.duration !== (payload.backgroundVideo?.duration || 0) || state.videoUrl !== (payload.backgroundVideo?.url || '')) throw new Error('Zustand state did not match the supplied RenderPayload after hydration.');
        updateReadyState({ zustandHydrated: true, timings: { ...window.__RENDER_READY_STATE__.timings, hydrationMs: performance.now() - hydrationStartedAt } });
        window.__EXPORT_MODE__ = true;
        let commandId = 0;
        window.SET_CURRENT_TIME = (time: number) => {
          if (!Number.isFinite(time)) throw new Error(`SET_CURRENT_TIME requires a finite number, received ${time}.`);
          commandId += 1;
          store.setCurrentTime(time);
          store.setActiveSegmentIndex(segments.findIndex((segment: any) => time >= segment.start && time <= segment.end));
          updateReadyState({ requestedTime: time, requestedCommandId: commandId });
          window.dispatchEvent(new CustomEvent('milestone2:set-current-time', { detail: { commandId } }));
          return commandId;
        };
        const fontsStartedAt = performance.now();
        const fonts = getAllUsedFonts(style);
        await preloadFonts(fonts);
        await Promise.all(fonts.map((font) => document.fonts.load(`700 24px "${font}"`)));
        await document.fonts.ready;
        updateReadyState({ fontsLoaded: true, timings: { ...window.__RENDER_READY_STATE__.timings, fontLoadingMs: performance.now() - fontsStartedAt } });
        if (!cancelled) setHydrated(true);
      } catch (error) { updateReadyState({ phase: 'error', error: error instanceof Error ? error.message : String(error) }); }
    };
    void init();
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const signalReady = async () => {
      try {
        updateReadyState({ phase: 'waiting' });
        const video = document.querySelector<HTMLVideoElement>('#video-player-container video');
        await Promise.all([waitForDocumentComplete(), waitForVideoReady(video)]);
        if (cancelled) return;
        updateReadyState({ phase: 'ready', videoReady: !video || video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA, documentReady: document.readyState === 'complete' });
        window.__IS_READY_TO_RENDER__ = true;
        setReady(true);
      } catch (error) { updateReadyState({ phase: 'error', error: error instanceof Error ? error.message : String(error) }); }
    };
    void signalReady();
    return () => { cancelled = true; };
  }, [hydrated]);
  if (!hydrated) return <div id="capture-status" data-status="loading" className="text-zinc-500 text-sm p-4">Loading parity session...</div>;
  return <div id="capture-status" data-status={ready ? 'ready' : 'waiting'} className="w-full h-screen bg-black"><VideoPlayer /><RenderCommitSignal enabled={ready} /></div>;
}
export default function ParityTestPage() {
  return <Suspense fallback={<div id="capture-status" data-status="loading" />}><ParityTestInner /></Suspense>;
}
