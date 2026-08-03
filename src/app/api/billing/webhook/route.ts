import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planFromRazorpayPlan } from '@/lib/billing/razorpay';

type RazorpaySubscriptionEntity = {
  id?: string;
  plan_id?: string;
  customer_id?: string;
  status?: string;
  current_end?: number;
  notes?: Record<string, string>;
};

function validSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return NextResponse.json({ error: 'Razorpay webhook is not configured' }, { status: 400 });

  const rawBody = await request.text();
  if (!validSignature(rawBody, signature, webhookSecret)) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });

  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: { subscription?: { entity?: RazorpaySubscriptionEntity } };
    };
    const entity = event.payload?.subscription?.entity;
    if (!entity?.id) return NextResponse.json({ received: true });

    const userId = entity.notes?.user_id;
    if (!userId) throw new Error('Razorpay subscription is missing user_id metadata');
    const activeStatuses = new Set(['active', 'authenticated', 'charged', 'resumed']);
    const status = activeStatuses.has(entity.status || '') ? 'active' : (entity.status || 'pending');
    const { error } = await createAdminClient().from('billing_accounts').upsert({
      user_id: userId,
      plan: planFromRazorpayPlan(entity.plan_id),
      subscription_status: status,
      razorpay_customer_id: entity.customer_id || null,
      razorpay_subscription_id: entity.id,
      razorpay_plan_id: entity.plan_id || null,
      current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Razorpay webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
