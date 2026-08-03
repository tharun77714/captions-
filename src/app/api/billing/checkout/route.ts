import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpay, getRazorpayPlanId } from '@/lib/billing/razorpay';
import { isPlanId } from '@/lib/billing/plans';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { plan } = await request.json();
    if (!isPlanId(plan) || plan === 'free') {
      return NextResponse.json({ error: 'Choose Creator or Studio' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: account } = await admin
      .from('billing_accounts')
      .select('razorpay_subscription_id, subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();
    const razorpay = getRazorpay();
    const planId = getRazorpayPlanId(plan);

    if (account?.razorpay_subscription_id && ['active', 'authenticated', 'pending'].includes(account.subscription_status || '')) {
      await razorpay.subscriptions.update(account.razorpay_subscription_id, {
        plan_id: planId,
        schedule_change_at: 'cycle_end',
      });
      return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/dashboard/billing?updated=1` });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 1200,
      quantity: 1,
      customer_notify: 1,
      notes: { user_id: user.id, plan, email: user.email },
    });
    if (!subscription.short_url) return NextResponse.json({ error: 'Razorpay did not return a checkout URL' }, { status: 502 });

    const { error } = await admin.from('billing_accounts').upsert({
      user_id: user.id,
      plan: 'free',
      subscription_status: subscription.status,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: planId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return NextResponse.json({ url: subscription.short_url });
  } catch (error: unknown) {
    console.error('Razorpay checkout creation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 });
  }
}
