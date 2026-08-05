'use client';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'sepia'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('vidyut-theme') as 'dark' | 'sepia' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'sepia' : 'dark';
    setTheme(next);
    localStorage.setItem('vidyut-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
      title={theme === 'dark' ? 'Switch to Sepia mode' : 'Switch to Dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
