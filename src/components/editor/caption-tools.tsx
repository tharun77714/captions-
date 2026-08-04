import React, { useState } from 'react';
import { Wand2, Sparkles, X, Minimize2, Type, Eraser, Smile, Flame } from 'lucide-react';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-800 text-zinc-200 text-[10px] font-medium px-2 py-1 rounded shadow-lg z-50 border border-white/10 pointer-events-none">
          {content}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-b border-r border-white/10 rotate-45" />
        </div>
      )}
    </div>
  );
}

export function CaptionTools() {
  const {
    autoLineBreak,
    removeFillers,
    removePunctuation,
    removeEmojis,
    restoreEmphasis,
    removeGaps,
    applyAiEmojis,
    applyAiHighlighting,
  } = useEditorStore();

  return (
    <div className="flex flex-wrap items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-white/5 shadow-inner">
      <Tooltip content="AI Emojis Overlay (Beast Mode)">
        <button
          onClick={applyAiEmojis}
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/30 hover:to-fuchsia-600/30 border border-violet-500/30 text-violet-300 rounded text-[11px] font-medium transition-all hover:scale-[1.02]"
        >
          <Smile className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
          <span>AI Emojis</span>
        </button>
      </Tooltip>

      <Tooltip content="AI Keyword Color Highlights">
        <button
          onClick={applyAiHighlighting}
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 rounded text-[11px] font-medium transition-all hover:scale-[1.02]"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Keywords</span>
        </button>
      </Tooltip>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      <Tooltip content="Remove Fillers (um, uh, like...)">
        <button
          onClick={removeFillers}
          className="p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded transition-colors"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Auto Line Break (42 chars)">
        <button
          onClick={() => autoLineBreak(42)}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Wand2 className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Remove Silence & Gaps">
        <button
          onClick={removeGaps}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Restore Emphasis">
        <button
          onClick={restoreEmphasis}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Type className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Remove Punctuation">
        <button
          onClick={removePunctuation}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Clear All Emojis">
        <button
          onClick={removeEmojis}
          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}
