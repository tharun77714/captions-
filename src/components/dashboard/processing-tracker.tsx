'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProcessingTrackerProps {
  projectId: string;
  initialStatus: string;
}

export function ProcessingTracker({ projectId, initialStatus }: ProcessingTrackerProps) {
  const router = useRouter();

  useEffect(() => {
    // Only poll if the status is not 'ready' and not 'failed'
    if (initialStatus === 'ready' || initialStatus === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ready' || data.status === 'failed') {
            clearInterval(interval);
            // Refresh the server component page to render the ready state
            router.refresh();
          }
        }
      } catch (e) {
        console.error('Error polling project status:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId, initialStatus, router]);

  return null; // Invisible helper component
}
