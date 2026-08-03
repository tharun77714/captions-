import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planFromStripePrice } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlanId } from '@/lib/billing/plans';

function idOf(value: string | { id: string } | null) {
  return typeof value === 'string' ? value : value?.id || null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) throw new Error('Subscription is missing user_id metadata');
  const priceId = subscription.items.data[0]?.price?.id;
  const metadataPlan = subscription.metadata.plan;
  const plan = isPlanId(metadataPlan) ? metadataPlan : planFromStripePrice(priceId);
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const { error } = await createAdminClient().from('billing_accounts').upsert({
    user_id: userId,
    plan,
    subscription_status: subscription.status,
    stripe_customer_id: idOf(subscription.customer),
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') {
        await syncSubscription(await getStripe().subscriptions.retrieve(session.subscription));
      }
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Stripe webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
