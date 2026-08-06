'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Menu, 
  X, 
  ArrowRight, 
  Mic, 
  Languages, 
  Video, 
  Zap,
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#09090b] rounded-[7px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                Vidyut AI
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                PRO
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
          <div 
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-800/50 transition-all">
              <span>Features</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${featuresOpen ? 'rotate-180 text-zinc-100' : ''}`} />
            </button>

            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1 w-64 p-2 rounded-xl bg-zinc-900/95 border border-zinc-800 backdrop-blur-xl shadow-2xl shadow-black/80 z-50"
                >
                  <Link href="#voice-cloning" className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/80 transition-colors group">
                    <div className="p-2 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">AI Voice Cloning</div>
                      <div className="text-[11px] text-zinc-400">Telugu to English cross-lingual voice matching</div>
                    </div>
                  </Link>

                  <Link href="#captions" className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/80 transition-colors group mt-1">
                    <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                      <Languages className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Multilingual Subtitles</div>
                      <div className="text-[11px] text-zinc-400">Word-level timestamps for Short-form Reels</div>
                    </div>
                  </Link>

                  <Link href="#dubbing" className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/80 transition-colors group mt-1">
                    <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">Instant Video Dubbing</div>
                      <div className="text-[11px] text-zinc-400">Seamless audio replacement with 95%+ precision</div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="#voice-cloning" className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-800/50 transition-all flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-violet-400" />
            <span>Voice Cloning</span>
          </Link>

          <Link href="#pricing" className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-800/50 transition-all">
            Pricing
          </Link>

          <Link href="#testimonials" className="px-3 py-1.5 rounded-md hover:text-zinc-100 hover:bg-zinc-800/50 transition-all">
            Showcase
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link 
            href="/auth/login" 
            className="text-sm font-medium text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors"
          >
            Sign in
          </Link>
          
          <Link 
            href="/dashboard" 
            className="group relative px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-[#09090b] hover:bg-white transition-all shadow-md shadow-zinc-100/10 flex items-center gap-2 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-zinc-900/95 border-b border-zinc-800 mt-3 -mx-4 px-6 pb-6 pt-2"
          >
            <div className="flex flex-col gap-3 text-sm">
              <Link 
                href="#voice-cloning" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-zinc-300 hover:text-white"
              >
                <Mic className="w-4 h-4 text-violet-400" />
                <span>AI Voice Cloning</span>
              </Link>
              <Link 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-zinc-300 hover:text-white"
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-zinc-300 hover:text-white"
              >
                Pricing
              </Link>
              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
                <Link 
                  href="/auth/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800"
                >
                  Sign in
                </Link>
                <Link 
                  href="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-lg text-sm font-medium text-[#09090b] bg-zinc-100 hover:bg-white"
                >
                  Launch Studio
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
