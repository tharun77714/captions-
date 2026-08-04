'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Zap, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

function safeNext(value: string | null) {
  return value?.startsWith('/') ? value : '/dashboard';
}

export default function SignUpPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#09090b]" />}><SignUpForm /></Suspense>;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get('next'));
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If session is immediately available, redirect directly to dashboard
    if (data.session) {
      router.replace(nextPath);
      router.refresh();
      return;
    }

    // If no session is returned, Supabase requires email verification
    setMessage('Account created! A verification link has been sent to your email. (Tip: Check your spam folder if you do not see it within 1 minute, or try Google Sign-In for instant access).');
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4ecdc] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Vidyut<span className="text-violet-400">.ai</span></span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-400">Get instant access to Beast Mode word animations & Nova 3 transcription.</p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <p className="flex-1 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Google OAuth Button */}
        <button 
          type="button" 
          onClick={handleGoogle} 
          disabled={loading} 
          className="mt-6 w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 hover:border-white/20 transition-all shadow-md disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7 8.9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.6C.6 9 0 10.7 0 12.6s.6 3.6 1.6 5l3.7-2.8z" />
            <path fill="#34A853" d="M12 23.6c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2-6.7-4.8l-3.7 2.8c1.9 3.8 5.8 6.7 10.4 6.7z" />
          </svg>
          <span>Continue with Google</span>
          <span className="text-[10px] text-emerald-400 font-mono font-normal ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Instant</span>
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-medium text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          <span>or sign up with email</span>
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Email address
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(event) => setEmail(event.target.value)} 
              placeholder="creator@example.com"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors shadow-inner text-sm" 
            />
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            Password (minimum 6 characters)
            <input 
              required 
              minLength={6} 
              type="password" 
              value={password} 
              onChange={(event) => setPassword(event.target.value)} 
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors shadow-inner text-sm" 
            />
          </label>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Creating account…' : 'Create account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link className="text-violet-400 font-bold hover:underline" href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
