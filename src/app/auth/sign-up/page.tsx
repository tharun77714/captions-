'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function safeNext(value: string | null) {
  return value?.startsWith('/') ? value : '/dashboard';
}

export default function SignUpPage() {
  return <Suspense fallback={<main className="min-h-screen bg-black" />}><SignUpForm /></Suspense>;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
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
    if (data.session) {
      router.replace(nextPath);
      router.refresh();
      return;
    }
    setMessage('Check your email to confirm your account, then sign in.');
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <p className="text-sm font-medium text-violet-400">Vidyut Captions</p>
        <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-400">Your captions and exports will belong only to you.</p>
        {error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {message && <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-zinc-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-violet-500" /></label>
          <label className="block text-sm text-zinc-300">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-violet-500" /></label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">{loading ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">Already have an account? <Link className="text-violet-400 hover:underline" href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link></p>
      </div>
    </main>
  );
}
