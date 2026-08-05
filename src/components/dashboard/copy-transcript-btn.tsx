'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyTranscriptBtn({ segments }: { segments: Array<{ text: string }> }) {
  const [copied, setCopied] = useState(false);
  const text = segments.map(s => s.text.trim()).join('\n');
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy transcript'}
    </button>
  );
}
