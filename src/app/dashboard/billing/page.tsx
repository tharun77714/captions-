import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PLAN_CONFIG, effectivePlan, type PlanId } from '@/lib/billing/plans';
import { BillingPortalButton, CheckoutButton } from '@/components/billing/plan-actions';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [{ data: account }, { data: usage }] = await Promise.all([
    supabase.from('billing_accounts').select('plan, subscription_status, current_period_end').eq('user_id', user.id).maybeSingle(),
    supabase.from('usage_events').select('resource, amount, created_at').eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
  ]);

  const currentPlan = effectivePlan(account?.plan, account?.subscription_status);
  const current = PLAN_CONFIG[currentPlan];
  const transcriptionUsed = (usage || []).filter((item) => item.resource === 'transcription').reduce((sum, item) => sum + item.amount, 0);
  const exportFloor = current.exportPeriod === 'day' ? dayStart.getTime() : monthStart.getTime();
  const exportsUsed = (usage || []).filter((item) => item.resource === 'export' && new Date(item.created_at).getTime() >= exportFloor).reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div><Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link><h1 className="mt-3 text-4xl font-bold">Plans and usage</h1></div>
          {currentPlan !== 'free' && <BillingPortalButton />}
        </div>

        <section className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:grid-cols-2">
          <div><p className="text-sm text-zinc-500">Caption usage</p><p className="mt-2 text-2xl font-semibold">{Math.ceil(transcriptionUsed / 60)} / {current.transcriptionSecondsPerMonth / 60} minutes</p></div>
          <div><p className="text-sm text-zinc-500">Export usage</p><p className="mt-2 text-2xl font-semibold">{exportsUsed} / {current.exportsPerPeriod} per {current.exportPeriod}</p></div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {(Object.keys(PLAN_CONFIG) as PlanId[]).map((planId) => {
            const plan = PLAN_CONFIG[planId];
            return (
              <article key={plan.id} className={`rounded-2xl border p-6 ${currentPlan === plan.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-zinc-950'}`}>
                <h2 className="text-2xl font-bold">{plan.name}</h2><p className="mt-2 text-sm text-zinc-400">{plan.description}</p><p className="mt-4 text-xl font-semibold">{plan.monthlyPriceInr === 0 ? 'Free' : `₹${plan.monthlyPriceInr}/month`}</p>
                <ul className="my-6 space-y-3 text-sm text-zinc-300">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
                {plan.id === 'free' ? <div className="rounded-lg border border-zinc-800 px-4 py-3 text-center text-sm text-zinc-400">{currentPlan === 'free' ? 'Current plan' : 'Available after cancellation'}</div> : <CheckoutButton plan={plan.id} currentPlan={currentPlan} />}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
