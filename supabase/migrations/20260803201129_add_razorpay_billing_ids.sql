ALTER TABLE public.billing_accounts
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;
