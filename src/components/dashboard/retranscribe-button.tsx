'use client';
import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

export function RetranscribeButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('auto');
  const [loading, setLoading] = useState(false);

  const handleRetranscribe = async () => {
    if (!confirm('This will delete the existing transcript and re-run transcription. Continue?')) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/retranscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.reload();
    } else {
      alert('Failed to start re-transcription.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Re-transcribe
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-4">
          <p className="text-xs font-semibold text-zinc-300 mb-3">Select Language</p>
          <select
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-md p-2 mb-3"
            value={lang}
            onChange={e => setLang(e.target.value)}
          >
            <option value="auto">Auto Detect</option>
            <option value="te">Telugu</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="kn">Kannada</option>
            <option value="ml">Malayalam</option>
            <option value="en">English</option>
          </select>
          <button
            onClick={handleRetranscribe}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-100 text-[#09090b] text-xs font-semibold rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? 'Starting...' : 'Start Re-transcription'}
          </button>
        </div>
      )}
    </div>
  );
}
