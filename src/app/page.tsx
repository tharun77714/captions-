'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Flame, 
  Wand2, 
  Zap, 
  CheckCircle2, 
  Play, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  TrendingUp, 
  Globe, 
  Award,
  ChevronRight,
  Sliders,
  Terminal,
  Cpu
} from 'lucide-react';

const DEMO_CAPTIONS = {
  telugu: [
    { word: 'Mee', emoji: '', highlight: false },
    { word: 'video', emoji: '🎬', highlight: false },
    { word: 'ki', emoji: '', highlight: false },
    { word: 'సరైన', emoji: '✨', highlight: true, color: 'text-amber-400' },
    { word: 'క్యాప్షన్స్', emoji: '🔥', highlight: true, color: 'text-violet-400' },
  ],
  hindi: [
    { word: 'Aapke', emoji: '', highlight: false },
    { word: 'Reels', emoji: '📱', highlight: false },
    { word: 'pe', emoji: '', highlight: false },
    { word: 'viral', emoji: '🚀', highlight: true, color: 'text-emerald-400' },
    { word: 'engagement', emoji: '📈', highlight: true, color: 'text-cyan-400' },
  ],
  english: [
    { word: 'Make', emoji: '', highlight: false },
    { word: 'EVERY', emoji: '⚡', highlight: true, color: 'text-yellow-400' },
    { word: 'single', emoji: '', highlight: false },
    { word: 'second', emoji: '⏱️', highlight: false },
    { word: 'HIT HARD', emoji: '💥', highlight: true, color: 'text-rose-400' },
  ],
  tamil: [
    { word: 'Ungal', emoji: '', highlight: false },
    { word: 'video', emoji: '🎥', highlight: false },
    { word: 'ukku', emoji: '', highlight: false },
    { word: 'சரியான', emoji: '🌟', highlight: true, color: 'text-fuchsia-400' },
    { word: 'கேப்ஷன்ஸ்', emoji: '⚡', highlight: true, color: 'text-amber-400' },
  ]
};

const TESTIMONIALS = [
  {
    handle: '@techwithyesh',
    followers: '401K followers',
    quote: 'Captions are insanely accurate without spelling mistakes in regional lipi or Tanglish. Zero second pass needed.',
    verified: true,
    avatar: 'T'
  },
  {
    handle: '@rishikesav_m',
    followers: '287K followers',
    quote: 'Crazy. No spelling mistakes. Beast mode word-by-word timing with neon glows!',
    verified: true,
    avatar: 'R'
  },
  {
    handle: '@manjuaitalks',
    followers: '229K followers',
    quote: 'Very useful for short-form creators. The AI keyword highlights save me 2 hours every Reel.',
    verified: true,
    avatar: 'M'
  },
  {
    handle: '@raj_creators',
    followers: '512K followers',
    quote: 'The Hormozi and Ali Abdaal presets look like they were custom keyframed in After Effects!',
    verified: true,
    avatar: 'R'
  },
  {
    handle: '@vibe_with_karan',
    followers: '145K followers',
    quote: 'Nova 3 speech engine doesn’t miss a single word even with background hiphop beats playing.',
    verified: true,
    avatar: 'V'
  }
];

export default function Home() {
  const [activeLang, setActiveLang] = useState<'telugu' | 'hindi' | 'english' | 'tamil'>('telugu');
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [enableKaraoke, setEnableKaraoke] = useState(true);
  const [enableEmojis, setEnableEmojis] = useState(true);

  // Auto loop the active word in the live subtitle preview
  useEffect(() => {
    const words = DEMO_CAPTIONS[activeLang];
    const timer = setInterval(() => {
      setActiveWordIdx((prev) => (prev + 1) % words.length);
    }, 480);
    return () => clearInterval(timer);
  }, [activeLang]);

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4ecdc] selection:bg-violet-600/40 selection:text-white font-sans overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-violet-900/20 via-fuchsia-900/10 to-transparent blur-[120px] opacity-70" />
        <div className="absolute top-[30%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-amber-900/15 via-orange-900/10 to-transparent blur-[140px] opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Floating Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#09090b]/80 border-b border-white/10 px-6 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-extrabold tracking-tight text-xl text-white">Vidyut<span className="text-violet-400">.ai</span></span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500/20 to-violet-500/20 border border-amber-500/30 text-amber-300">
              Beast 2.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a>
            <a href="#features" className="hover:text-white transition-colors">Beast Features</a>
            <a href="#reviews" className="hover:text-white transition-colors">Creator Proof</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/auth/login" 
              className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-300 hover:text-white transition-colors hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link 
              href="/auth/sign-up" 
              className="relative group overflow-hidden rounded-xl p-px font-semibold text-sm shadow-lg shadow-violet-600/30 transition-all hover:shadow-violet-600/50 hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 group-hover:opacity-90 transition-opacity" />
              <div className="relative px-4 py-2 rounded-[11px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center gap-1.5">
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 max-w-6xl mx-auto text-center" id="demo">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-zinc-900 to-zinc-900/80 border border-white/10 shadow-inner mb-6"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            Powered by Nova 3 Precision & Beast AI Engine
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.08] text-white"
        >
          Word-by-word viral captions for <span className="bg-gradient-to-r from-amber-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Reels & Shorts.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal"
        >
          Publish-ready multilingual subtitles in Tanglish, Telugu, Tamil, Hindi & English. Burned into your video with dynamic neon karaoke animations in under 60 seconds.
        </motion.p>

        {/* Live Interactive Caption Simulator */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 max-w-3xl mx-auto rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative group overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-violet-500 to-fuchsia-500 opacity-75" />

          {/* Language Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {(['telugu', 'hindi', 'english', 'tamil'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => { setActiveLang(lang); setActiveWordIdx(0); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  activeLang === lang 
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 scale-105' 
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {lang === 'telugu' ? '🇹🇪 Telugu & Tanglish' : lang === 'hindi' ? '🇮🇳 Hindi & Hinglish' : lang === 'tamil' ? '🇹🇲 Tamil Lipi' : '🇺🇸 Hormozi English'}
              </button>
            ))}
          </div>

          {/* Animated Caption Display */}
          <div className="min-h-[140px] flex items-center justify-center p-6 rounded-xl bg-black/60 border border-white/5 relative overflow-hidden shadow-inner">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE BEAST RENDERER
            </div>

            {/* Feature Toggle Control Bar inside Demo */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[11px] font-medium bg-zinc-900/80 px-2.5 py-1 rounded-md border border-white/5">
              <button 
                onClick={() => setEnableKaraoke(!enableKaraoke)} 
                className={`flex items-center gap-1 hover:text-amber-300 transition-colors ${enableKaraoke ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}
              >
                <Flame className="w-3 h-3" /> Karaoke Glow
              </button>
              <span className="text-zinc-700">•</span>
              <button 
                onClick={() => setEnableEmojis(!enableEmojis)} 
                className={`flex items-center gap-1 hover:text-fuchsia-300 transition-colors ${enableEmojis ? 'text-fuchsia-400 font-bold' : 'text-zinc-500'}`}
              >
                <Sparkles className="w-3 h-3" /> AI Emojis
              </button>
            </div>

            {/* Spoken sentence word sequence */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-6 pt-4 pb-2 max-w-2xl">
              {DEMO_CAPTIONS[activeLang].map((item, idx) => {
                const isActive = idx === activeWordIdx;
                return (
                  <div key={idx} className="relative flex flex-col items-center justify-end">
                    {/* Floating AI Emoji above word */}
                    <AnimatePresence>
                      {enableEmojis && item.emoji && (isActive || item.highlight) && (
                        <motion.span
                          initial={{ opacity: 0, y: 6, scale: 0.5 }}
                          animate={{ opacity: 1, y: -2, scale: isActive ? 1.25 : 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute -top-7 text-2xl filter drop-shadow-md select-none pointer-events-none"
                        >
                          {item.emoji}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Word text */}
                    <span 
                      onClick={() => setActiveWordIdx(idx)}
                      className={`cursor-pointer text-2xl sm:text-4xl font-black transition-all duration-200 tracking-tight px-1 py-0.5 rounded ${
                        isActive && enableKaraoke
                          ? `scale-125 -translate-y-1 ${item.color || 'text-amber-400'} drop-shadow-[0_0_15px_rgba(251,191,36,0.65)] bg-white/5`
                          : isActive 
                            ? `${item.color || 'text-white'} scale-110` 
                            : item.highlight
                              ? `${item.color || 'text-zinc-200'} opacity-85 hover:opacity-100`
                              : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {item.word}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero typos in native lipi or Tanglish phonetics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span>1-Click filler removal (<em>um, uh, like</em>) & auto gaps</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Remotion browser rendering in &lt; 60 seconds</span>
            </div>
          </div>
        </motion.div>

        {/* Primary CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link 
            href="/auth/sign-up" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white font-bold text-lg shadow-xl shadow-violet-600/40 hover:shadow-violet-600/60 transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 fill-current text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Try Beast Mode For Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-bold text-lg transition-all flex items-center justify-center gap-2 hover:border-white/20"
          >
            <Play className="w-4 h-4 text-violet-400 fill-current" />
            <span>Open Studio</span>
          </Link>
        </motion.div>
      </section>

      {/* Social Proof Infinite Marquee Section */}
      <section className="py-16 border-y border-white/10 bg-black/40 overflow-hidden relative" id="reviews">
        <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Creator Verified</p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Real feedback from 400K+ creator networks</h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto mt-2">Publishing daily without ever checking for spelling mistakes or manual timing shifts.</p>
        </div>

        {/* Marquee Track */}
        <div className="relative w-full overflow-hidden flex">
          <div className="animate-marquee flex gap-6 px-3">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <div 
                key={index}
                className="w-[320px] sm:w-[380px] p-5 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950/80 border border-white/10 hover:border-violet-500/40 transition-all shrink-0 flex flex-col justify-between shadow-lg"
              >
                <p className="text-sm text-zinc-200 leading-relaxed font-normal mb-4">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {item.avatar}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-white">{item.handle}</span>
                      <ShieldCheck className="w-4 h-4 text-amber-400 fill-current/20 shrink-0" />
                    </div>
                    <span className="text-[11px] font-mono text-violet-400">{item.followers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Frictionless Workflow Grid */}
      <section className="py-24 px-6 max-w-6xl mx-auto" id="how-it-works">
        <div className="text-center mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Frictionless Flow</div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">Upload, apply Beast style, export.</h2>
          <p className="text-zinc-400 text-base max-w-xl mx-auto mt-3">No timelines to sync by hand. Our deterministic Remotion engine and Nova 3 transcription handle the heavy lifting.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              num: '01',
              title: 'Upload Audio or Video',
              desc: 'Drop your Reel or Short. Nova 3 analyzes spoken regional dialect and phonetics with millisecond word timestamps.',
              color: 'from-amber-500/20 to-orange-500/5',
              border: 'border-amber-500/30',
              badge: 'text-amber-400',
              icon: Globe
            },
            {
              num: '02',
              title: '1-Click Beast AI Magic',
              desc: 'Hit our AI Emojis & Keyword highlights button. Automatically remove filler words like "um", "uh", and awkward silences.',
              color: 'from-violet-500/20 to-fuchsia-500/5',
              border: 'border-violet-500/30',
              badge: 'text-violet-400',
              icon: Wand2
            },
            {
              num: '03',
              title: 'Burn & Export instantly',
              desc: 'Export 60fps video directly in your browser with Remotion technology. Ready-to-post MP4 without cloud render queue delays.',
              color: 'from-fuchsia-500/20 to-pink-500/5',
              border: 'border-fuchsia-500/30',
              badge: 'text-fuchsia-400',
              icon: Zap
            }
          ].map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={idx} 
                className={`relative rounded-3xl p-8 bg-gradient-to-b ${step.color} border ${step.border} backdrop-blur-md flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 shadow-xl`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`font-mono text-lg font-black px-3 py-1 rounded-full bg-zinc-900 border border-white/10 ${step.badge}`}>
                      STEP {step.num}
                    </span>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <IconComponent className={`w-6 h-6 ${step.badge}`} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Zero lag rendering</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Matrix / Beast Advantage */}
      <section className="py-20 bg-zinc-950/80 border-t border-white/10 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">Competitive Differentiator</span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mt-2">Built to beat Captions.ai & Kalakaar.</h2>
            <p className="text-zinc-400 mt-4">We took every high-end video feature and compressed it into a web editor that renders faster and costs a fraction of standard tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                title: 'Nova 3 AI Transcription',
                desc: 'Unrivaled Indian regional accuracy (Telugu, Hindi, Tamil, Kannada, Malayalam) plus native English support without robotic hallucination.'
              },
              {
                icon: Flame,
                title: 'Radiant Karaoke Glows',
                desc: 'Words don’t just change color; they lift, zoom 1.18x, and emit dual-layer neon light filters that hook viewer attention instantly.'
              },
              {
                icon: Sparkles,
                title: 'AI Emoji Overlays',
                desc: 'Our semantic dictionary automatically attaches context-aware animated emojis directly above high-impact spoken words.'
              },
              {
                icon: Sliders,
                title: 'Hormozi & MrBeast Presets',
                desc: 'Pre-loaded styles engineered to mimic viral typography formulas with bold drop-shadows, uppercase emphasis, and high contrast.'
              },
              {
                icon: Layers,
                title: '1-Click Filler Removal',
                desc: 'Cleanse stumbling sounds ("um", "uh", "you know") and automatically tighten silence gaps across the transcript with a single tap.'
              },
              {
                icon: Terminal,
                title: 'Deterministic Browser Render',
                desc: 'No waiting in endless cloud rendering queues. Our Remotion engine uses your GPU to export 1080p vertical shorts locally in seconds.'
              }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-violet-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-violet-300" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{feat.desc}</p>
                  </div>
                  <div className="mt-6 text-[11px] font-semibold text-violet-400 flex items-center gap-1">
                    <span>Included in Free Plan</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Action Callout Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center" id="pricing">
        <div className="relative rounded-3xl p-10 sm:p-16 bg-gradient-to-tr from-violet-950/80 via-zinc-900/90 to-amber-950/80 border border-white/15 overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl" />
          
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20 mb-4 inline-block">
            Start Your Viral Streak Today
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2 max-w-2xl mx-auto">
            Ready to give your Reels the Beast aesthetic?
          </h2>
          <p className="mt-4 text-zinc-300 max-w-xl mx-auto text-base">
            No subscription barriers to test. Upload your first video now and experience the speed of Nova 3 and instant AI word animations.
          </p>

          <div className="mt-8 flex justify-center">
            <Link 
              href="/auth/sign-up" 
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-violet-600 to-fuchsia-600 text-white font-black text-lg shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <span>Get Started Right Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-zinc-950 text-zinc-500 text-sm px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400 fill-current" />
            <span className="font-bold text-zinc-300">Vidyut Captions</span>
            <span>© 2026. Built for creators worldwide.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">API & Models (Nova 3)</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
