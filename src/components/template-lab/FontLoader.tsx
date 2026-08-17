'use client';

import React, { useEffect, useState } from 'react';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=Noto+Sans+Telugu:wght@400..900&family=Noto+Serif+Telugu:wght@400..700&display=swap';

export default function FontLoader({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let mounted = true;
    let existingLink = document.getElementById('template-lab-fonts') as HTMLLinkElement;
    if (!existingLink) {
      existingLink = document.createElement('link');
      existingLink.href = FONT_URL;
      existingLink.rel = 'stylesheet';
      existingLink.id = 'template-lab-fonts';
      document.head.appendChild(existingLink);
    }

    const checkFonts = async () => {
      try {
        // Wait for stylesheet to load if it's not already loaded
        await new Promise<void>((resolve, reject) => {
          // If we just created it or it hasn't fired onload yet
          existingLink.onload = () => resolve();
          existingLink.onerror = () => reject(new Error('Stylesheet failed to load'));
          
          // Reject on timeout (e.g. 5 seconds)
          setTimeout(() => reject(new Error('Stylesheet load timeout')), 5000);
          
          // In case it's already loaded before we attach listeners, we just proceed.
          // But since we create it right above, this mostly handles the dynamic creation case.
        });

        // Test representative text for all fonts
        const testText = 'Hello World తెలుగు';
        const interLoad = await document.fonts.load(`16px "Inter"`, testText);
        const notoSansLoad = await document.fonts.load(`16px "Noto Sans Telugu"`, testText);
        const notoSerifLoad = await document.fonts.load(`16px "Noto Serif Telugu"`, testText);

        if (!mounted) return;

        // Require every returned FontFace array to be non-empty
        if (interLoad.length === 0 || notoSansLoad.length === 0 || notoSerifLoad.length === 0) {
          setStatus('failed');
          return;
        }

        // Verify check
        if (
          !document.fonts.check('16px "Inter"') || 
          !document.fonts.check('16px "Noto Sans Telugu"') ||
          !document.fonts.check('16px "Noto Serif Telugu"')
        ) {
          setStatus('failed');
          return;
        }

        setStatus('ready');
      } catch (_err) {
        if (mounted) setStatus('failed');
      }
    };

    checkFonts();

    return () => {
      mounted = false;
      const el = document.getElementById('template-lab-fonts');
      if (el) el.remove();
    };
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#fff' }}>
        Loading Lab Fonts...
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#f87171' }}>
        Failed to load required fonts. Check network.
      </div>
    );
  }

  return <>{children}</>;
}
