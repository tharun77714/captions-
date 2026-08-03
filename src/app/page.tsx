import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <section className="w-full max-w-4xl text-center">
        <div className="mx-auto mb-8 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
          Multilingual captions for creators
        </div>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Make every word hit.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Upload your video, generate accurate word-level captions, style every moment, and export a ready-to-post video.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/auth/sign-up" className="rounded-xl bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500">Create free account</Link>
          <Link href="/auth/login" className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold hover:bg-zinc-900">Sign in</Link>
        </div>
        <p className="mt-8 text-sm text-zinc-600">Telugu, Hindi, Tamil, Kannada, Malayalam, English, and automatic language detection.</p>
      </section>
    </main>
  );
}
