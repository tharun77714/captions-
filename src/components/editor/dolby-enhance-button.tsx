'use client';

import React, { useState } from 'react';
import { Wand2, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

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
          setErrorMsg(data.error || 'Failed to enhance audio with Dolby.');
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
        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        title="Isolate voice & eliminate background noise with Dolby.io AI"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
        ) : status === 'done' ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Wand2 className="w-3.5 h-3.5 text-violet-400" />
        )}
        <span>{loading ? 'Enhancing...' : status === 'done' ? 'Enhanced' : 'Dolby Voice'}</span>
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
