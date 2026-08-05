'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DolbyEnhanceButtonProps {
  projectId: string;
  onSuccess?: () => void;
}

export function DolbyEnhanceButton({ projectId, onSuccess }: DolbyEnhanceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'enhancing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!confirm('Run Dolby.io AI Voice Enhancement? This will isolate human speech, remove background noise, and master vocal volume.')) {
      return;
    }

    setLoading(true);
    setStatus('enhancing');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/enhance-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresKey) {
          setErrorMsg('Add DOLBY_API_KEY to your environment variables to enable Dolby AI Enhancement.');
        } else {
          setErrorMsg(data.error || 'Failed to enhance audio.');
        }
        setStatus('error');
        return;
      }

      setStatus('done');
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 1200);

    } catch (err: unknown) {
      console.error('Dolby enhance failed:', err);
      setErrorMsg('Network or connection error. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleEnhance}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-violet-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        title="Isolate voice & eliminate background noise with Dolby.io AI"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : status === 'done' ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        )}
        <span>{loading ? 'Enhancing with Dolby...' : status === 'done' ? 'Enhanced!' : 'Dolby AI Voice'}</span>
      </button>

      {status === 'error' && errorMsg && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-zinc-900 border border-rose-500/30 rounded-xl shadow-2xl z-50 text-[11px] text-rose-300 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Dolby Setup Required</span>
          </div>
          <p className="leading-relaxed text-zinc-300">{errorMsg}</p>
          <button
            onClick={() => setStatus('idle')}
            className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium text-[10px] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
