'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/editor/video-player';
import { useEditorStore } from '@/store/editor-store';
import testPayloads from '../../../parity_test_payloads.json';

function ParityTestInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    // parity_test_payloads.json project_id might be "1_telugu" 
    const payload = (testPayloads as any[]).find(p => p.project_id.startsWith(id + '_'));
    if (payload) {
       const store = useEditorStore.getState();
       store.setTranscriptData(payload.segments, payload.segments.flatMap((s: any) => s.words));
       store.setSubtitleStyle(payload.style);
       store.setCurrentTime(1.0); // Subtitles usually visible at 1.0s in tests
       store.setDuration(10.0); 
       
       const idx = payload.segments.findIndex((s: any) => 1.0 >= s.start && 1.0 <= s.end);
       store.setActiveSegmentIndex(idx >= 0 ? idx : 0);
       
       // Force trigger layout rendering by slightly delaying readiness
       setTimeout(() => setReady(true), 100);
    }
  }, [id]);

  if (!ready) return <div id="capture-status" data-status="loading" className="text-white">Loading...</div>;

  return (
    <div id="capture-status" data-status="ready" className="w-full h-screen bg-black">
      <VideoPlayer />
    </div>
  );
}

export default function ParityTestPage() {
  return (
    <Suspense fallback={<div />}>
      <ParityTestInner />
    </Suspense>
  );
}
