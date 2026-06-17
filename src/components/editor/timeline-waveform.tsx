'use client';

import React, { useEffect, useRef } from 'react';
import type { WaveformData } from '@/store/editor-store';

interface TimelineWaveformProps {
  timelineZoom: number;
  duration: number;
  waveform?: WaveformData;
  currentTime: number;
}

export function TimelineWaveform({ timelineZoom, duration, waveform, currentTime }: TimelineWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform || waveform.min.length === 0 || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = duration * timelineZoom;
    const height = 64;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const resolution = waveform.resolution || 100;
    const pixelsPerBucket = timelineZoom / resolution;
    
    // Density Reduction: 2px spacing gives the curve room to breathe without blobbing
    const visualBarSpacing = 2; 
    const bucketsPerBar = Math.max(1, Math.floor(visualBarSpacing / pixelsPerBucket));
    const numBars = Math.floor(width / visualBarSpacing);
    const playheadX = currentTime * timelineZoom;
    const midY = height / 2;
    const maxH = (height / 2) * 0.9;

    const topPoints: {x: number, y: number}[] = [];
    const bottomPoints: {x: number, y: number}[] = [];

    for (let i = 0; i < numBars; i++) {
      const x = i * visualBarSpacing;
      if (x > width) break;

      const startBucket = i * bucketsPerBar;
      const endBucket = Math.min((i + 1) * bucketsPerBar, waveform.min.length);
      if (startBucket >= waveform.min.length) break;

      let minVal = 0;
      let maxVal = 0;
      for (let b = startBucket; b < endBucket; b++) {
        if (waveform.min[b] < minVal) minVal = waveform.min[b];
        if (waveform.max[b] > maxVal) maxVal = waveform.max[b];
      }

      // Perceptual Scaling (Dynamic Range): Math.pow(val, 1.4)
      // This crushes background noise and expands visual dynamic range,
      // making transients "pop" dramatically.
      const scaledMax = Math.pow(maxVal, 1.4);
      // minVal is negative, so we convert to positive, scale, and revert
      const scaledMin = -Math.pow(-minVal, 1.4);

      const topY = midY - (scaledMax * maxH);
      const bottomY = midY - (scaledMin * maxH);

      topPoints.push({ x, y: topY });
      bottomPoints.push({ x, y: bottomY });
    }

    if (topPoints.length === 0) return;

    ctx.beginPath();

    // Top edge: Left to Right with Cubic Bezier Smoothing
    // This perfectly hits every transient peak while rounding the silhouette
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 0; i < topPoints.length - 1; i++) {
      const p1 = topPoints[i];
      const p2 = topPoints[i + 1];
      const midX = (p1.x + p2.x) / 2;
      ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
    }

    // Bottom edge: Right to Left with Cubic Bezier Smoothing
    ctx.lineTo(bottomPoints[bottomPoints.length - 1].x, bottomPoints[bottomPoints.length - 1].y);
    for (let i = bottomPoints.length - 1; i > 0; i--) {
      const p1 = bottomPoints[i];     // Rightmost
      const p2 = bottomPoints[i - 1]; // Leftmost
      const midX = (p1.x + p2.x) / 2;
      ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
    }

    ctx.closePath();

    // Apply high-performance split gradient for Past / Future
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    const playheadPercent = Math.max(0, Math.min(1, playheadX / width));
    
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.95)'); // violet-500
    gradient.addColorStop(playheadPercent, 'rgba(139, 92, 246, 0.95)');
    
    if (playheadPercent < 1) {
      gradient.addColorStop(playheadPercent + 0.0001, 'rgba(113, 113, 122, 0.45)'); // zinc-500
      gradient.addColorStop(1, 'rgba(113, 113, 122, 0.45)');
    }

    ctx.fillStyle = gradient;
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [waveform, duration, timelineZoom, currentTime]);

  const width = duration * timelineZoom;

  return (
    <div
      className="absolute inset-x-0 pointer-events-none"
      style={{ width: `${width}px`, top: '28px', height: '64px' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: '64px' }}
      />
    </div>
  );
}
