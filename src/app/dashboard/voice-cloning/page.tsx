import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import VoiceCloningStudio from '@/components/VoiceCloningStudio';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default async function VoiceCloningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-zinc-800 selection:text-zinc-100 antialiased font-sans">
      {/* Dashboard Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center shadow-sm">
                <span className="text-[#09090b] font-bold text-xs">V</span>
              </div>
              <span className="font-semibold tracking-tight text-base text-zinc-100">Vidyut Studio</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-zinc-500 border-r border-zinc-800 pr-3 mr-1 truncate max-w-[200px]">
              {user.email}
            </span>
            <Link 
              href="/dashboard/voice-cloning" 
              className="rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 font-medium flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors shadow-sm shadow-violet-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Voice Cloning</span>
            </Link>
            <Link 
              href="/dashboard/exports" 
              className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Exports
            </Link>
            <Link 
              href="/dashboard/analytics" 
              className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Analytics
            </Link>
            <Link 
              href="/dashboard/billing" 
              className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              Plan
            </Link>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button 
                type="submit" 
                className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio Workspace</span>
          </Link>
        </div>

        <VoiceCloningStudio />
      </main>
    </div>
  );
}
