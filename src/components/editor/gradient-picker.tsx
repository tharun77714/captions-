import React, { useState } from 'react';
import { ColorConfig } from '@/lib/subtitle-schema-v2';
import { cn } from '@/lib/utils';
import { Palette, Blend } from 'lucide-react';

export function GradientPicker({
  value,
  onChange,
}: {
  value: ColorConfig;
  onChange: (config: ColorConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>(value.mode || 'solid');

  const solidPresets = ['#FFFFFF', '#000000', '#facc15', '#f87171', '#60a5fa', '#34d399', '#c084fc'];
  const gradientPresets = [
    { from: '#facc15', to: '#f97316' }, // Yellow to Orange
    { from: '#60a5fa', to: '#c084fc' }, // Blue to Purple
    { from: '#34d399', to: '#3b82f6' }, // Green to Blue
    { from: '#f87171', to: '#ec4899' }, // Red to Pink
  ];

  const handleModeChange = (mode: 'solid' | 'gradient') => {
    setActiveTab(mode);
    onChange({
      ...value,
      mode,
      gradientFrom: value.gradientFrom || '#ffffff',
      gradientTo: value.gradientTo || '#000000',
      gradientAngle: value.gradientAngle ?? 90,
    });
  };

  const updateSolid = (color: string) => {
    onChange({ ...value, mode: 'solid', solid: color });
  };

  const updateGradient = (updates: Partial<ColorConfig>) => {
    onChange({ ...value, mode: 'gradient', ...updates });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Switcher */}
      <div className="flex bg-zinc-900 rounded p-1">
        <button
          onClick={() => handleModeChange('solid')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-sm transition-colors',
            activeTab === 'solid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Palette className="w-3 h-3" /> Solid
        </button>
        <button
          onClick={() => handleModeChange('gradient')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-sm transition-colors',
            activeTab === 'gradient' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Blend className="w-3 h-3" /> Gradient
        </button>
      </div>

      {activeTab === 'solid' ? (
        <div className="space-y-2">
          <ColorInput color={value.solid} onChange={updateSolid} />
          <div className="flex flex-wrap gap-1 mt-2">
            {solidPresets.map((c) => (
              <button
                key={c}
                onClick={() => updateSolid(c)}
                className="w-5 h-5 rounded-full border border-white/10 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-[9px] text-zinc-500 font-semibold uppercase">From</span>
              <ColorInput 
                color={value.gradientFrom || '#ffffff'} 
                onChange={(c) => updateGradient({ gradientFrom: c })} 
              />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[9px] text-zinc-500 font-semibold uppercase">To</span>
              <ColorInput 
                color={value.gradientTo || '#000000'} 
                onChange={(c) => updateGradient({ gradientTo: c })} 
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[9px] text-zinc-500 font-semibold uppercase">Angle</span>
              <span className="text-[9px] text-zinc-400 font-mono">{value.gradientAngle ?? 90}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={value.gradientAngle ?? 90}
              onChange={(e) => updateGradient({ gradientAngle: parseInt(e.target.value) })}
              className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {gradientPresets.map((g, i) => (
              <button
                key={i}
                onClick={() => updateGradient({ gradientFrom: g.from, gradientTo: g.to })}
                className="w-6 h-6 rounded border border-white/10 shadow-sm transition-transform hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorInput({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  // basic safety
  const hexValue = color?.startsWith('#') ? color.substring(0, 7) : '#ffffff';
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-6 h-6 rounded bg-zinc-800 overflow-hidden border border-white/10 cursor-pointer shrink-0 shadow-sm">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer opacity-0"
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color }} />
      </div>
      <input
        type="text"
        value={color || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full bg-zinc-950 border border-white/5 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-violet-500/50"
        placeholder="#FFFFFF"
      />
    </div>
  );
}
