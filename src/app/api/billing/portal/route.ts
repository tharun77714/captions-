import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/billing/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const admin = createAdminClient();
    const { data: account } = await admin
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account?.stripe_customer_id) {
      return NextResponse.json({ error: 'No paid subscription found' }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Billing portal creation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Billing portal failed' }, { status: 500 });
  }
}
