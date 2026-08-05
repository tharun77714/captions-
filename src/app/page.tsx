'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Sliders, 
  Video, 
  Terminal, 
  Cpu,
  Clock,
  Play,
  Pause,
  FileText,
  Volume2,
  Settings,
  ChevronRight
} from 'lucide-react';

const DEMO_CAPTIONS = {
  telugu: [
    { start: '00:00.2', end: '00:01.4', text: 'Mee video ki saraina', translation: 'For your video appropriate' },
    { start: '00:01.5', end: '00:02.8', text: 'క్యాప్షన్స్ మరియు ఎడిటింగ్', translation: 'captions and editing' },
    { start: '00:02.9', end: '00:04.1', text: 'Kevalam konni secondulo', translation: 'In just a few seconds' },
    { start: '00:04.2', end: '00:05.5', text: 'Vidyut Studio tho sadhyam', translation: 'Possible with Vidyut Studio' },
  ],
  hindi: [
    { start: '00:00.3', end: '00:01.5', text: 'Aapke Shorts aur Reels', translation: 'Your Shorts and Reels' },
    { start: '00:01.6', end: '00:02.9', text: 'के लिए बिल्कुल सटीक', translation: 'with complete precision' },
    { start: '00:03.0', end: '00:04.2', text: 'Word-by-word timestamps', translation: 'Word-by-word timestamps' },
    { start: '00:04.3', end: '00:05.6', text: 'Bina kisi spelling error ke', translation: 'Without any spelling errors' },
  ],
  english: [
    { start: '00:00.1', end: '00:01.3', text: 'Designed for deep focus', translation: 'Distraction-free workspace' },
    { start: '00:01.4', end: '00:02.6', text: 'High-end functional minimalism', translation: 'Precision font positioning' },
    { start: '00:02.7', end: '00:04.0', text: 'Zero cloud rendering queues', translation: 'Instant local export' },
    { start: '00:04.1', end: '00:05.4', text: 'Captions that feel like they belong', translation: 'Seamless integration' },
  ],
  tamil: [
    { start: '00:00.2', end: '00:01.4', text: 'Ungal video-vukana', translation: 'For your video' },
    { start: '00:01.5', end: '00:02.7', text: 'துல்லியமான கேப்ஷன்ஸ்', translation: 'accurate captions' },
    { start: '00:02.8', end: '00:04.1', text: 'Tanglish & regional lipi', translation: 'Tanglish & regional scripts' },
    { start: '00:04.2', end: '00:05.5', text: 'Vidyut Studio v2.0', translation: 'Vidyut Studio v2.0' },
  ]
};

const TESTIMONIALS = [
  {
    handle: 'Rishi Kesav',
    role: 'Lead Video Producer',
    quote: 'The switch from noisy editing suites to Vidyut has been refreshing. The workspace feels intentional, quiet, and reliable.',
  },
  {
    handle: 'Anand Kumar',
    role: 'Short-form Strategist',
    quote: 'Regional language accuracy in Telugu and Tanglish is immaculate. It removes all friction from our post-production pipeline.',
  },
  {
    handle: 'Siddharth Mehta',
    role: 'Creative Director',
    quote: 'Finally, a transcription tool built with real design restraint. No clunky overlays or distracting neon effects—just clean precision.',
  }
];

export default function Home() {
  const [activeLang, setActiveLang] = useState<'telugu' | 'hindi' | 'english' | 'tamil'>('telugu');
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [preset, setPreset] = useState<'lumina' | 'studio' | 'minimal'>('lumina');

  // Smooth cycle through caption lines
  useEffect(() => {
    if (!isPlaying) return;
    const lines = DEMO_CAPTIONS[activeLang];
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % lines.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [activeLang, isPlaying]);

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-zinc-800 selection:text-zinc-100 font-sans antialiased">
      {/* Subtle architectural background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:48px_48px] -z-10" />

      {/* Clean Minimalist Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center shadow-sm">
              <span className="text-[#09090b] font-bold text-xs">V</span>
            </div>
            <span className="font-semibold tracking-tight text-base text-zinc-100">Vidyut Studio</span>
            <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
              v2.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-normal text-zinc-400">
            <a href="#workspace" className="hover:text-zinc-100 transition-colors">Workspace</a>
            <a href="#philosophy" className="hover:text-zinc-100 transition-colors">Philosophy</a>
            <a href="#testimonials" className="hover:text-zinc-100 transition-colors">Testimonials</a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login" 
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign in
            </Link>
            <Link 
              href="/auth/sign-up" 
              className="px-3.5 py-2 rounded-md text-sm font-medium bg-zinc-100 text-[#09090b] hover:bg-white transition-all shadow-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Serene Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>High-end functional minimalism for short-form creators</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-[1.12] text-zinc-100">
          Captions that feel like they belong.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
          An intentional workspace for video creators. Generate high-accuracy Telugu, Tamil, Hindi, and English subtitles in a calm, distraction-free environment.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/auth/sign-up" 
            className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-zinc-100 text-[#09090b] font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#workspace" 
            className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-zinc-900/80 text-zinc-300 border border-zinc-800 hover:bg-zinc-800/80 font-medium text-sm transition-colors"
          >
            Explore Workspace
          </a>
        </div>

        {/* Lumina Interactive Studio Preview */}
        <div id="workspace" className="mt-16 max-w-5xl mx-auto rounded-xl border border-zinc-800/80 bg-[#121215]/80 shadow-2xl overflow-hidden text-left">
          {/* Top Inspector Header */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-3">
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
              </div>
              <span className="font-medium text-zinc-300">Project_Studio_Master.mp4</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">1080×1920</span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1 mt-2 sm:mt-0 bg-zinc-950/60 p-1 rounded-md border border-zinc-800/60">
              {(['telugu', 'hindi', 'english', 'tamil'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setActiveLang(lang); setActiveIdx(0); }}
                  className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                    activeLang === lang 
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Editor Grid: Timeline Left, Video Preview Center/Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
            {/* Left Panel: Synchronized Captions List */}
            <div className="lg:col-span-6 border-r border-zinc-800/60 p-4 flex flex-col justify-between bg-zinc-950/30">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                  <span className="font-medium text-zinc-400">Transcript Timeline</span>
                  <span className="font-mono">4 segments</span>
                </div>

                {DEMO_CAPTIONS[activeLang].map((line, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`p-3 rounded-lg border text-sm transition-all cursor-pointer flex flex-col gap-1.5 ${
                      activeIdx === idx 
                        ? 'bg-zinc-800/70 border-zinc-700 text-zinc-100 shadow-sm' 
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                      <span>{line.start} → {line.end}</span>
                      {activeIdx === idx && (
                        <span className="text-[10px] uppercase font-sans text-blue-400 font-medium">Playing</span>
                      )}
                    </div>
                    <p className="font-medium tracking-tight text-base leading-snug">{line.text}</p>
                    <span className="text-xs text-zinc-500 italic">{line.translation}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <span>Auto-sync simulation</span>
                </div>
                <span>Nova 3 Model</span>
              </div>
            </div>

            {/* Right Panel: Calm Video Preview & Presets */}
            <div className="lg:col-span-6 flex flex-col justify-between p-6 bg-zinc-950/80">
              {/* Preset Switcher Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 text-xs">
                <span className="text-zinc-500 font-medium">Typography Preset</span>
                <div className="flex gap-1">
                  {[
                    { id: 'lumina', name: 'Lumina Clean' },
                    { id: 'studio', name: 'Studio Slate' },
                    { id: 'minimal', name: 'Apple Mono' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPreset(item.id as any)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        preset === item.id 
                          ? 'bg-zinc-200 text-zinc-900' 
                          : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/50'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Player Canvas Mockup */}
              <div className="my-auto py-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-xs aspect-[9/14] rounded-lg bg-zinc-900/90 border border-zinc-800/80 flex flex-col justify-between p-6 relative overflow-hidden shadow-inner">
                  {/* Subtle video background gradient simulating neutral footage */}
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/20 via-transparent to-zinc-950/80 pointer-events-none" />

                  <div className="flex justify-between items-center z-10 text-zinc-500 text-xs">
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Raw Stream</span>
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Rendered Subtitle Layer */}
                  <div className="z-10 text-center my-auto transition-all duration-200 px-2">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${activeLang}-${activeIdx}-${preset}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {preset === 'lumina' && (
                          <div className="inline-block py-1.5 px-4 rounded-md bg-zinc-950/90 border border-zinc-700/80 text-zinc-100 font-semibold text-lg tracking-tight shadow-md">
                            {DEMO_CAPTIONS[activeLang][activeIdx].text}
                          </div>
                        )}
                        {preset === 'studio' && (
                          <div className="text-zinc-100 font-bold text-xl tracking-normal border-l-2 border-blue-500 pl-3 text-left">
                            {DEMO_CAPTIONS[activeLang][activeIdx].text}
                          </div>
                        )}
                        {preset === 'minimal' && (
                          <div className="font-mono text-sm uppercase text-zinc-200 tracking-wider px-3 py-1 rounded bg-zinc-900/80 border border-zinc-800">
                            {DEMO_CAPTIONS[activeLang][activeIdx].text}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="z-10 flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-zinc-800/60 pt-3">
                    <span>{DEMO_CAPTIONS[activeLang][activeIdx].start}</span>
                    <span>HD 60FPS</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 text-center">
                <Link href="/auth/sign-up" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                  Experience full control in the live editor &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Studio Philosophy Section */}
      <section id="philosophy" className="py-24 border-t border-zinc-800/50 bg-zinc-950/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Design Philosophy</h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              Engineered for clarity and deep focus.
            </h3>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base">
              Traditional editing tools overwhelm creators with chaotic timelines and flashy templates. Vidyut provides a minimalist environment built for productivity.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition-all">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300 mb-5">
                <Terminal className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-zinc-200 text-base">Regional Speech AI</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Natively fine-tuned to comprehend regional nuances, dialects, and Tanglish scripts without awkward translation errors or missing phonetic characters.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition-all">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300 mb-5">
                <Sliders className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-zinc-200 text-base">Restrained Typography</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Forget garish rainbow animations. Our presets emphasize readable font weights, soft shadow layers, and purposeful positioning that respects your footage.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700/80 transition-all">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300 mb-5">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-zinc-200 text-base">Zero-Queue Remotion</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Render MP4 exports cleanly in your browser using local WASM and Remotion capabilities. No waiting for remote servers or cloud rendering queues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Creator Perspectives</h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              Trusted by meticulous producers.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 flex flex-col justify-between">
                <p className="text-sm text-zinc-300 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-4 border-t border-zinc-800/50">
                  <p className="font-medium text-sm text-zinc-200">{t.handle}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparent Pricing */}
      <section id="pricing" className="py-24 border-t border-zinc-800/50 bg-zinc-950/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Simple Membership</h2>
            <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
              Pricing that respects your workflow.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-semibold text-zinc-100">Starter</h4>
                <p className="text-2xl font-bold text-zinc-100 mt-2">₹0 <span className="text-xs font-normal text-zinc-500">/ forever</span></p>
                <p className="text-xs text-zinc-400 mt-1">Perfect for evaluating speech accuracy.</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> 3 video transcriptions / mo</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> Regional language detection</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> Standard Lumina preset</li>
                </ul>
              </div>
              <Link href="/auth/sign-up" className="mt-8 w-full py-2 rounded-md border border-zinc-700 text-zinc-300 font-medium text-sm text-center hover:bg-zinc-800 transition-colors">
                Try Free
              </Link>
            </div>

            {/* Creator */}
            <div className="p-6 rounded-xl border border-zinc-700 bg-zinc-900/50 flex flex-col justify-between relative shadow-lg">
              <span className="absolute top-4 right-4 text-[10px] font-semibold bg-zinc-100 text-zinc-950 px-2 py-0.5 rounded">
                POPULAR
              </span>
              <div>
                <h4 className="text-base font-semibold text-zinc-100">Creator Studio</h4>
                <p className="text-2xl font-bold text-zinc-100 mt-2">₹499 <span className="text-xs font-normal text-zinc-500">/ month</span></p>
                <p className="text-xs text-zinc-400 mt-1">For active short-form video editors.</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" /> 30 full video projects / mo</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" /> All regional Indian scripts</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" /> Unrestricted styling & export</li>
                </ul>
              </div>
              <Link href="/auth/sign-up" className="mt-8 w-full py-2 rounded-md bg-zinc-100 text-zinc-950 font-medium text-sm text-center hover:bg-white transition-colors">
                Start Pro Studio
              </Link>
            </div>

            {/* Studio */}
            <div className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/20 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-semibold text-zinc-100">Team Production</h4>
                <p className="text-2xl font-bold text-zinc-100 mt-2">₹1,299 <span className="text-xs font-normal text-zinc-500">/ month</span></p>
                <p className="text-xs text-zinc-400 mt-1">Unlimited scale for agencies and podcasts.</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> Unlimited transcriptions</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> Priority speech alignment</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" /> Direct SRT & VTT stems</li>
                </ul>
              </div>
              <Link href="/auth/sign-up" className="mt-8 w-full py-2 rounded-md border border-zinc-700 text-zinc-300 font-medium text-sm text-center hover:bg-zinc-800 transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="border-t border-zinc-800/60 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Vidyut Studio. Engineered with focus.</p>
          <div className="flex gap-6">
            <Link href="/auth/login" className="hover:text-zinc-300 transition-colors">Sign in</Link>
            <Link href="/auth/sign-up" className="hover:text-zinc-300 transition-colors">Register</Link>
            <a href="#workspace" className="hover:text-zinc-300 transition-colors">Workspace</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
