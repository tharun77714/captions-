'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/store/editor-store';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Star,
  Target,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipSuggestion {
  segmentIds: number[];
  startTime: number;
  endTime: number;
  text: string;
  score: number;
  reason: string;
  hook: string;
  type: 'emotional' | 'educational' | 'viral' | 'storytelling';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TYPE_CONFIG = {
  emotional: { color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300', icon: '❤️', label: 'Emotional' },
  educational: { color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300', icon: '🧠', label: 'Educational' },
  viral: { color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-300', icon: '🔥', label: 'Viral' },
  storytelling: { color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300', icon: '📖', label: 'Story Arc' },
};

export function AiClipFinder() {
  const { segments, setCurrentTime, projectTitle } = useEditorStore() as any;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const analyze = useCallback(async () => {
    if (!segments || segments.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setSuggestions([]);

    try {
      // Build transcript text with timestamps
      const transcript = segments
        .filter((s: any) => s.text.trim().length > 0)
        .map((s: any) => `[${formatTime(s.start)}-${formatTime(s.end)}] ${s.text.trim()}`)
        .join('\n');

      const res = await fetch('/api/ai/clip-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `API error ${res.status}`);
      }

      const data = await res.json();
      
      // Map suggested clips back to actual segment objects
      const mapped: ClipSuggestion[] = (data.clips || []).map((clip: any) => {
        // Find segments that overlap with the suggested time range
        const matchingSegs = segments.filter(
          (s: any) => s.start < clip.endTime && s.end > clip.startTime
        );
        
        const text = matchingSegs.map((s: any) => s.text.trim()).join(' ');
        const actualStart = matchingSegs[0]?.start ?? clip.startTime;
        const actualEnd = matchingSegs[matchingSegs.length - 1]?.end ?? clip.endTime;
        
        return {
          segmentIds: matchingSegs.map((s: any) => s.id),
          startTime: actualStart,
          endTime: actualEnd,
          text,
          score: clip.score,
          reason: clip.reason,
          hook: clip.hook,
          type: clip.type || 'viral',
        };
      });

      setSuggestions(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze transcript');
    } finally {
      setIsAnalyzing(false);
    }
  }, [segments]);

  const copyHook = (hook: string, idx: number) => {
    navigator.clipboard.writeText(hook);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">AI Clip Finder</h2>
            <p className="text-[10px] text-zinc-500">Detect viral-worthy moments</p>
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={isAnalyzing || segments.length === 0}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border',
            isAnalyzing
              ? 'bg-violet-600/20 border-violet-500/30 text-violet-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-violet-500/50 text-white shadow-lg shadow-violet-600/20'
          )}
        >
          {isAnalyzing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Zap className="w-4 h-4" />
              </motion.div>
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Find Viral Clips
            </>
          )}
        </button>

        {segments.length > 0 && (
          <p className="text-[9px] text-zinc-600 text-center mt-2">
            Analyzing {segments.length} segments · Powered by Gemini AI
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {/* Error State */}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Loading shimmer */}
        {isAnalyzing && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-zinc-900/50 rounded-xl border border-white/5 animate-pulse">
                <div className="h-3 bg-zinc-800 rounded w-1/3 mb-2" />
                <div className="h-2 bg-zinc-800 rounded w-full mb-1" />
                <div className="h-2 bg-zinc-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isAnalyzing && suggestions.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center">
              <Target className="w-6 h-6 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">No clips yet</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Click &ldquo;Find Viral Clips&rdquo; to analyze your transcript
              </p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  {suggestions.length} Clips Found
                </p>
                <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <TrendingUp className="w-3 h-3" />
                  Sorted by viral score
                </div>
              </div>

              {suggestions.map((clip, idx) => {
                const typeConf = TYPE_CONFIG[clip.type] || TYPE_CONFIG.viral;
                const isExpanded = expandedIdx === idx;
                const duration = clip.endTime - clip.startTime;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={cn(
                      'rounded-xl border bg-gradient-to-br overflow-hidden transition-all',
                      typeConf.color
                    )}
                  >
                    {/* Card Header */}
                    <button
                      className="w-full p-3 text-left"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base shrink-0">{typeConf.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn('text-[9px] font-bold uppercase tracking-wider', typeConf.color.split(' ').pop())}>
                                {typeConf.label}
                              </span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, si) => (
                                  <Star
                                    key={si}
                                    className={cn(
                                      'w-2 h-2',
                                      si < Math.round(clip.score / 20)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-zinc-700'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-300 line-clamp-2 leading-snug">
                              {clip.text.slice(0, 80)}{clip.text.length > 80 ? '…' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(clip.startTime)}
                          </div>
                          <span className="text-[9px] text-zinc-600">{duration.toFixed(0)}s</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
                            {/* Why it's viral */}
                            <div>
                              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Why it works</p>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">{clip.reason}</p>
                            </div>

                            {/* Hook */}
                            {clip.hook && (
                              <div>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Suggested Hook</p>
                                <div className="flex items-start gap-2 p-2 bg-black/30 rounded-lg">
                                  <MessageSquare className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-zinc-300 leading-relaxed flex-1">{clip.hook}</p>
                                  <button
                                    onClick={() => copyHook(clip.hook, idx)}
                                    className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Copy hook"
                                  >
                                    <Copy className={cn('w-3 h-3', copied === idx ? 'text-emerald-400' : 'text-zinc-500')} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCurrentTime(clip.startTime)}
                                className="flex-1 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-[10px] font-semibold text-zinc-300 transition-colors flex items-center justify-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                Jump to Clip
                              </button>
                            </div>

                            {/* Score bar */}
                            <div>
                              <div className="flex justify-between text-[9px] text-zinc-600 mb-1">
                                <span>Viral Score</span>
                                <span className="font-mono">{clip.score}/100</span>
                              </div>
                              <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${clip.score}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className={cn(
                                    'h-full rounded-full',
                                    clip.score >= 80
                                      ? 'bg-gradient-to-r from-violet-500 to-pink-500'
                                      : clip.score >= 60
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                      : 'bg-zinc-600'
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
