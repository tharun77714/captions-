'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ChevronDown, ChevronRight, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';

export function StylePanelV2() {
  const { subtitleStyle, setSubtitleStyle } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'Templates' | 'Text' | 'Position' | 'Animation'>('Text');
  
  // Accordion states
  const [typographyOpen, setTypographyOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);
  const [backgroundOpen, setBackgroundOpen] = useState(true);

  return (
    <div className="flex flex-col h-full bg-[#18181B] text-[#FAFAFA]">
      {/* Tabs */}
      <div className="flex border-b border-[#27272A] shrink-0 bg-[#0E0E10] px-2 pt-2">
        {['Templates', 'Text', 'Position', 'Animation'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-2 text-[12px] font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-[#7C3AED] text-white' 
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Inspector Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Text' && (
          <div className="p-3 space-y-4">
            
            {/* TYPOGRAPHY SECTION */}
            <div className="border border-[#27272A] rounded-lg bg-[#0E0E10] overflow-hidden">
              <button 
                onClick={() => setTypographyOpen(!typographyOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-[#18181B] hover:bg-[#27272A] transition-colors"
              >
                <span className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">Typography</span>
                {typographyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              
              {typographyOpen && (
                <div className="p-3 space-y-3">
                  <div className="flex gap-2">
                    <select className="flex-1 h-[28px] bg-[#18181B] border border-[#27272A] rounded px-2 text-[12px] focus:outline-none focus:border-[#7C3AED]">
                      <option>Noto Sans Telugu</option>
                      <option>Inter</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <select className="w-1/2 h-[28px] bg-[#18181B] border border-[#27272A] rounded px-2 text-[12px] focus:outline-none focus:border-[#7C3AED]">
                      <option>Bold 700</option>
                      <option>Regular 400</option>
                    </select>
                    <div className="w-1/2 flex items-center bg-[#18181B] border border-[#27272A] rounded overflow-hidden">
                      <input 
                        type="number" 
                        value={subtitleStyle.fontSize}
                        onChange={(e) => setSubtitleStyle({ fontSize: Number(e.target.value) })}
                        className="w-full h-[28px] bg-transparent px-2 text-[12px] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <div className="flex bg-[#18181B] border border-[#27272A] rounded overflow-hidden">
                      <button className="h-[28px] w-[32px] flex items-center justify-center hover:bg-[#27272A]"><Bold className="h-3.5 w-3.5" /></button>
                      <button className="h-[28px] w-[32px] flex items-center justify-center hover:bg-[#27272A] border-l border-[#27272A]"><Italic className="h-3.5 w-3.5" /></button>
                      <button className="h-[28px] w-[32px] flex items-center justify-center hover:bg-[#27272A] border-l border-[#27272A]"><Underline className="h-3.5 w-3.5" /></button>
                    </div>
                    
                    <div className="flex bg-[#18181B] border border-[#27272A] rounded overflow-hidden">
                      <button className="h-[28px] w-[32px] flex items-center justify-center hover:bg-[#27272A]"><AlignLeft className="h-3.5 w-3.5" /></button>
                      <button className="h-[28px] w-[32px] flex items-center justify-center bg-[#27272A] border-l border-[#27272A]"><AlignCenter className="h-3.5 w-3.5 text-white" /></button>
                      <button className="h-[28px] w-[32px] flex items-center justify-center hover:bg-[#27272A] border-l border-[#27272A]"><AlignRight className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLOR SECTION */}
            <div className="border border-[#27272A] rounded-lg bg-[#0E0E10] overflow-hidden">
              <button 
                onClick={() => setColorOpen(!colorOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-[#18181B] hover:bg-[#27272A] transition-colors"
              >
                <span className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">Color</span>
                {colorOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              
              {colorOpen && (
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-400">Text</span>
                    <div className="flex items-center gap-2 border border-[#27272A] bg-[#18181B] rounded h-[28px] px-2">
                      <div className="w-3 h-3 rounded-full bg-[#FAFAFA]" />
                      <span className="font-mono text-zinc-300">#FAFAFA</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-zinc-400">Active Word</span>
                    <div className="flex items-center gap-2 border border-[#27272A] bg-[#18181B] rounded h-[28px] px-2">
                      <div className="w-3 h-3 rounded-full bg-[#7C3AED]" />
                      <span className="font-mono text-zinc-300">#7C3AED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BACKGROUND SECTION */}
            <div className="border border-[#27272A] rounded-lg bg-[#0E0E10] overflow-hidden">
              <button 
                onClick={() => setBackgroundOpen(!backgroundOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-[#18181B] hover:bg-[#27272A] transition-colors"
              >
                <span className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">Background</span>
                {backgroundOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              
              {backgroundOpen && (
                <div className="p-3 space-y-3">
                  <div className="flex bg-[#18181B] border border-[#27272A] rounded p-0.5">
                    <button className="flex-1 py-1 text-center rounded-sm text-zinc-400 hover:text-white">None</button>
                    <button className="flex-1 py-1 text-center rounded-sm bg-[#27272A] text-white">Box</button>
                    <button className="flex-1 py-1 text-center rounded-sm text-zinc-400 hover:text-white">Highlight</button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] text-zinc-400">Opacity</span>
                    <span className="text-[12px]">85%</span>
                  </div>
                  <input type="range" min="0" max="100" defaultValue="85" className="w-full accent-[#7C3AED]" />
                </div>
              )}
            </div>
            
          </div>
        )}
        
        {activeTab !== 'Text' && (
          <div className="p-4 text-center text-zinc-500">
            {activeTab} controls coming soon.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#27272A] bg-[#0E0E10]">
        <button className="w-full h-[32px] rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium transition-colors">
          Apply to All Segments
        </button>
      </div>
    </div>
  );
}
