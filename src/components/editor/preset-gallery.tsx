'use client';

import React from 'react';
import { PRESETS } from '@/lib/preset-engine';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export function PresetGallery() {
  const { subtitleStyle, applyCreatorPreset } = useEditorStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          AI Creator Presets
        </h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
        {PRESETS.map((preset) => {
          const isActive = subtitleStyle.activePreset?.id === preset.id;
          
          return (
            <button
              key={preset.id}
              onClick={() => applyCreatorPreset(preset.id, preset.version)}
              className={cn(
                'relative flex-shrink-0 w-32 aspect-video rounded-lg border overflow-hidden transition-all group snap-start',
                isActive
                  ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-lg shadow-violet-500/20'
                  : 'border-white/10 hover:border-white/20 hover:shadow-md'
              )}
            >
              <div 
                className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ background: preset.thumbnailGradient }}
              />
              
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              
              <div className="absolute inset-0 p-2 flex flex-col justify-end text-left">
                <span className="text-xs font-bold text-white leading-tight drop-shadow-md">
                  {preset.name}
                </span>
                <span className="text-[8px] text-white/80 font-medium tracking-wide">
                  V{preset.version}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
