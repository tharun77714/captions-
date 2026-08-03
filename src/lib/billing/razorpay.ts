import Razorpay from 'razorpay';
import type { PlanId } from './plans';

let client: Razorpay | null = null;

export function getRazorpay() {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay credentials are not configured');
  client = new Razorpay({ key_id, key_secret });
  return client;
}

export function getRazorpayPlanId(plan: Exclude<PlanId, 'free'>) {
  const planId = plan === 'creator' ? process.env.RAZORPAY_CREATOR_PLAN_ID : process.env.RAZORPAY_STUDIO_PLAN_ID;
  if (!planId) throw new Error(`Razorpay ${plan} plan is not configured`);
  return planId;
}

export function planFromRazorpayPlan(planId: string | null | undefined): PlanId {
  if (planId && planId === process.env.RAZORPAY_STUDIO_PLAN_ID) return 'studio';
  if (planId && planId === process.env.RAZORPAY_CREATOR_PLAN_ID) return 'creator';
  return 'free';
}
