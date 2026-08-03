'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function safeNext(value: string | null) {
  return value?.startsWith('/') ? value : '/dashboard';
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-black" />}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get('next'));
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

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

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <p className="text-sm font-medium text-violet-400">Vidyut Captions</p>
        <h1 className="mt-3 text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to keep your projects private and synced.</p>

        {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <button type="button" onClick={handleGoogle} disabled={loading} className="mt-6 w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-900 disabled:opacity-50">
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-600"><span className="h-px flex-1 bg-zinc-800" />or<span className="h-px flex-1 bg-zinc-800" /></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-zinc-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-violet-500" /></label>
          <label className="block text-sm text-zinc-300">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-violet-500" /></label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">New here? <Link className="text-violet-400 hover:underline" href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}>Create an account</Link></p>
      </div>
    </main>
  );
}
