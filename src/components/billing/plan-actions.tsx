'use client';

import { useState } from 'react';
import type { PlanId } from '@/lib/billing/plans';

async function openBillingRoute(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.error || 'Billing request failed');
  window.location.href = result.url;
}

export function CheckoutButton({ plan, currentPlan }: { plan: Exclude<PlanId, 'free'>; currentPlan: PlanId }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isCurrent = plan === currentPlan;

  return (
    <div>
      <button
        type="button"
        disabled={loading || isCurrent}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try { await openBillingRoute('/api/billing/checkout', { plan }); }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'Checkout failed'); setLoading(false); }
        }}
        className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCurrent ? 'Current plan' : loading ? 'Opening checkout…' : `Choose ${plan}`}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function BillingPortalButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try { await openBillingRoute('/api/billing/portal'); }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'Portal failed'); setLoading(false); }
        }}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
      >
        {loading ? 'Opening…' : 'Manage subscription'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
