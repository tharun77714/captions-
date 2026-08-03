import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, getStripePriceId } from '@/lib/billing/stripe';
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
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
      customer: account?.stripe_customer_id || undefined,
      customer_email: account?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/billing?success=1`,
      cancel_url: `${origin}/dashboard/billing?cancelled=1`,
    });

    if (!session.url) return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Checkout creation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 });
  }
}
