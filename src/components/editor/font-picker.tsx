'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { Search, Star, Clock, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type FontEntry, 
  type FontCategory,
  FONT_REGISTRY, 
  loadFont, 
  searchFonts, 
  getFavorites, 
  toggleFavorite, 
  getRecent, 
  addRecent 
} from '@/lib/font-registry';

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
}

type Tab = 'All' | 'Sans' | 'Serif' | 'Display' | 'Script' | 'Mono';

const TAB_MAPPING: Record<Tab, FontCategory | 'all'> = {
  'All': 'all',
  'Sans': 'sans-serif',
  'Serif': 'serif',
  'Display': 'display',
  'Script': 'handwriting',
  'Mono': 'monospace',
};

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load favorites and recent on mount
  useEffect(() => {
    setFavorites(getFavorites());
    setRecent(getRecent());
    setMounted(true);
  }, []);

  const handleSelect = useCallback((family: string) => {
    onChange(family);
    addRecent(family);
    setRecent(getRecent()); // refresh local state
  }, [onChange]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, family: string) => {
    e.stopPropagation();
    const newFavs = toggleFavorite(family);
    setFavorites(newFavs);
  }, []);

  // Filter fonts based on search and tab
  const filteredFonts = useMemo(() => {
    let list = search ? searchFonts(search) : FONT_REGISTRY;
    
    if (activeTab !== 'All') {
      const category = TAB_MAPPING[activeTab];
      list = list.filter(f => f.category === category);
    }
    
    return list;
  }, [search, activeTab]);

  // Separate favorites from main list if not searching
  const mainFonts = useMemo(() => {
    if (search) return filteredFonts;
    return filteredFonts.filter(f => !favorites.includes(f.family));
  }, [filteredFonts, search, favorites]);

  const favoriteFonts = useMemo(() => {
    if (search || activeTab !== 'All') return [];
    return FONT_REGISTRY.filter(f => favorites.includes(f.family));
  }, [search, activeTab, favorites]);

  // Combined list for virtualization
  const virtualizedItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'font', title?: string, font?: FontEntry }> = [];
    
    if (favoriteFonts.length > 0) {
      items.push({ type: 'header', title: 'Favorites' });
      favoriteFonts.forEach(font => items.push({ type: 'font', font }));
    }
    
    if (mainFonts.length > 0) {
      if (favoriteFonts.length > 0) {
        items.push({ type: 'header', title: 'All Fonts' });
      }
      mainFonts.forEach(font => items.push({ type: 'font', font }));
    }

    if (items.length === 0) {
      items.push({ type: 'header', title: 'No fonts found' });
    }
    
    return items;
  }, [favoriteFonts, mainFonts]);

  // Row Renderer for react-window
  const Row = useCallback(({ index, style }: any) => {
    const item = virtualizedItems[index];

    if (item.type === 'header') {
      return (
        <div style={style} className="flex items-center px-3 py-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {item.title}
          </span>
        </div>
      );
    }

    const font = item.font!;
    const isSelected = value === font.family;
    const isFavorite = favorites.includes(font.family);

    // Dynamic loading on render
    if (mounted) {
      loadFont(font.family);
    }

    return (
      <div style={style} className="px-1.5 py-0.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelect(font.family)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(font.family);
            }
          }}
          className={cn(
            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-all group cursor-pointer',
            isSelected
              ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {isSelected && <Check className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
            {!isSelected && <span className="w-3.5 shrink-0" />}
            <span 
              className="truncate"
              style={{ fontFamily: `"${font.family}", sans-serif` }}
            >
              {font.family}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-[8px] px-1 py-0.5 rounded font-mono font-medium",
              isSelected ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500"
            )}>
              {font.category === 'sans-serif' ? 'S' : 
               font.category === 'serif' ? 'Se' : 
               font.category === 'display' ? 'D' : 
               font.category === 'handwriting' ? 'H' : 'M'}
            </span>
            <button
              onClick={(e) => handleToggleFavorite(e, font.family)}
              className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
            >
              <Star 
                className={cn(
                  "w-3.5 h-3.5 transition-colors", 
                  isFavorite 
                    ? "fill-yellow-500 text-yellow-500" 
                    : "text-zinc-600 group-hover:text-zinc-400"
                )} 
              />
            </button>
          </div>
        </div>
      </div>
    );
  }, [virtualizedItems, value, favorites, handleSelect, handleToggleFavorite, mounted]);

  return (
    <div className="flex flex-col bg-zinc-950 border border-white/5 rounded-lg overflow-hidden h-full max-h-[400px]">
      {/* Search Bar */}
      <div className="p-2 border-b border-white/5 relative">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search fonts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-md py-1.5 pl-8 pr-8 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-800"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {!search && (
        <div className="flex overflow-x-auto scrollbar-none border-b border-white/5 bg-zinc-900/30 px-1">
          {(['All', 'Sans', 'Serif', 'Display', 'Script', 'Mono'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-all whitespace-nowrap relative',
                activeTab === tab
                  ? 'text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Recent Fonts */}
      {mounted && recent.length > 0 && !search && activeTab === 'All' && (
        <div className="p-2 border-b border-white/5 bg-zinc-900/10">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Recent</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.slice(0, 5).map(family => {
              // Ensure font is loaded for recent pills too
              loadFont(family);
              return (
                <button
                  key={family}
                  onClick={() => handleSelect(family)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-all truncate max-w-[120px]",
                    value === family 
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300" 
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                  style={{ fontFamily: `"${family}", sans-serif` }}
                  title={family}
                >
                  {family}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Virtualized List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[200px] max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {mounted && (
          <div className="flex flex-col">
            {virtualizedItems.map((_, index) => (
              <Row key={index} index={index} style={{ height: 36 }} />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-zinc-900/50 border-t border-white/5 text-[9px] text-zinc-500 flex justify-between items-center">
        <span>{filteredFonts.length} fonts</span>
        <span>Google Fonts</span>
      </div>
    </div>
  );
}
