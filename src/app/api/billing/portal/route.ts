import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpay } from '@/lib/billing/razorpay';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: account } = await createAdminClient()
      .from('billing_accounts')
      .select('razorpay_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!account?.razorpay_subscription_id) return NextResponse.json({ error: 'No paid subscription found' }, { status: 404 });

    await getRazorpay().subscriptions.cancel(account.razorpay_subscription_id, true);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Razorpay cancellation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cancellation failed' }, { status: 500 });
  }
}
