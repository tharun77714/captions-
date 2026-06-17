import React, { useState } from 'react';
import { Wand2, Sparkles, X, Minimize2, Type, Eraser } from 'lucide-react';
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
  } = useEditorStore();

  return (
    <div className="flex flex-wrap gap-1 bg-zinc-900 p-1 rounded-lg">
      <Tooltip content="Auto Line Break (42 chars)">
        <button
          onClick={() => autoLineBreak(42)}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Wand2 className="w-4 h-4" />
        </button>
      </Tooltip>
      <Tooltip content="Remove Fillers (um, uh, like...)">
        <button
          onClick={removeFillers}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Sparkles className="w-4 h-4" />
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
      <Tooltip content="Remove Emojis">
        <button
          onClick={removeEmojis}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
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
      <Tooltip content="Remove Silence/Gaps">
        <button
          onClick={removeGaps}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}
