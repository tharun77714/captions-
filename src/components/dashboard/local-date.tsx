'use client';

import React, { useEffect, useState } from 'react';

export function LocalDate({ timestamp }: { timestamp: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a blank or basic formatted date during SSR to avoid hydration mismatch
    return <span>Loading date...</span>;
  }

  try {
    const date = new Date(timestamp);
    return <span>{date.toLocaleString()}</span>;
  } catch (e) {
    return <span>{timestamp}</span>;
  }
}
