'use client';

import React, { useEffect, useState } from 'react';
import { VideoPlayer } from '@/components/editor/video-player';
import { useEditorStore } from '@/store/editor-store';
import { DEFAULT_STYLE } from '@/lib/subtitle-schema-v2';

export default function TestFixturePage() {
  const [ready, setReady] = useState(false);
  const setSubtitleStyle = useEditorStore((s) => s.setSubtitleStyle);
  const setVideoUrl = useEditorStore((s) => s.setVideoUrl);

  useEffect(() => {
    // Basic test fixture
    const params = new URLSearchParams(window.location.search);
    const fixtureId = params.get('fixture') || '1';

    let style = { ...DEFAULT_STYLE };
    let text = "Test word";
    
    // Default to a 5-second video, word at 1.0 - 2.0
    // We will use a blank video or just no video (VideoPlayer handles missing video by showing black)
    
    if (fixtureId === '1') {
      // Single Word
      text = "Single";
    } else if (fixtureId === '2') {
      text = "Short Sentence Here";
    } else if (fixtureId === '7') {
      // Background Box
      style.background = { enabled: true, color: 'rgba(255,0,0,0.8)' };
      style.paddingX = 20;
      style.paddingY = 10;
      style.borderRadius = 8;
      text = "Background Box Test";
    } else if (fixtureId === '8') {
      // Stroke
      style.stroke = { enabled: true, color: '#00FF00', width: 4 };
      text = "Stroke Heavy";
    } else if (fixtureId === '9') {
      // Shadow
      style.shadow = { enabled: true, color: 'rgba(0,0,255,1)', blur: 10, offsetX: 5, offsetY: 5 };
      text = "Shadow Heavy";
    }

    useEditorStore.setState({ segments: [
      {
        id: 1,
        start: 0.0,
        end: 3.0,
        text: text,
        words: text.split(' ').map((w, i) => ({
          id: `w-${i}`,
          word: w,
          start: 0.5 + (i * 0.5),
          end: 0.5 + ((i + 1) * 0.5)
        }))
      }
    ] });
    
    setSubtitleStyle(style);
    
    // Signal to Playwright that we are ready
    setTimeout(() => {
      setReady(true);
      (window as any).__FIXTURE_READY__ = true;
    }, 500);
  }, []);

  if (!ready) return null;

  return (
    <div style={{ width: '1920px', height: '1080px', position: 'relative' }}>
      <VideoPlayer />
    </div>
  );
}
