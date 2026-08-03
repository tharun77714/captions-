import Stripe from 'stripe';
import type { PlanId } from './plans';

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe is not configured');
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function getStripePriceId(plan: Exclude<PlanId, 'free'>) {
  const priceId = plan === 'creator'
    ? process.env.STRIPE_CREATOR_PRICE_ID
    : process.env.STRIPE_STUDIO_PRICE_ID;
  if (!priceId) throw new Error(`${plan} Stripe price is not configured`);
  return priceId;
}

export function planFromStripePrice(priceId?: string | null): PlanId {
  if (priceId && priceId === process.env.STRIPE_STUDIO_PRICE_ID) return 'studio';
  if (priceId && priceId === process.env.STRIPE_CREATOR_PRICE_ID) return 'creator';
  return 'free';
}
