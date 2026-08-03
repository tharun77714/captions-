CREATE TABLE IF NOT EXISTS public.billing_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'studio')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL CHECK (resource IN ('transcription', 'export', 'thumbnail')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_events_idempotency
  ON public.usage_events(user_id, resource, reference_id)
  WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_period
  ON public.usage_events(user_id, resource, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rendering' CHECK (status IN ('rendering', 'uploading', 'completed', 'failed', 'cancelled')),
  has_watermark BOOLEAN NOT NULL DEFAULT TRUE,
  file_size BIGINT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_user_created
  ON public.exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_project
  ON public.exports(project_id, created_at DESC);

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read their billing account" ON public.billing_accounts;
CREATE POLICY "users can read their billing account"
  ON public.billing_accounts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can read their usage" ON public.usage_events;
CREATE POLICY "users can read their usage"
  ON public.usage_events FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users can read their exports" ON public.exports;
CREATE POLICY "users can read their exports"
  ON public.exports FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.billing_accounts TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT SELECT ON public.exports TO authenticated;
GRANT ALL ON public.billing_accounts, public.usage_events, public.exports TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_usage(
  p_user_id UUID,
  p_resource TEXT,
  p_amount INTEGER,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  effective_plan TEXT := 'free';
  account_status TEXT := 'inactive';
  period_start TIMESTAMPTZ;
  usage_limit INTEGER;
  used_amount INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 OR p_resource NOT IN ('transcription', 'export', 'thumbnail') THEN
    RAISE EXCEPTION 'Invalid usage reservation';
  END IF;

  -- Serialize reservations for the same user/resource to prevent quota races.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT || ':' || p_resource, 0)
  );

  SELECT plan, subscription_status
    INTO effective_plan, account_status
  FROM public.billing_accounts
  WHERE user_id = p_user_id;

  IF effective_plan IS NULL OR account_status NOT IN ('active', 'trialing') THEN
    effective_plan := 'free';
  END IF;

  IF p_reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.usage_events
    WHERE user_id = p_user_id AND resource = p_resource AND reference_id = p_reference_id
  ) THEN
    RETURN jsonb_build_object('allowed', true, 'duplicate', true, 'plan', effective_plan);
  END IF;

  IF p_resource = 'transcription' THEN
    period_start := date_trunc('month', NOW());
    usage_limit := CASE effective_plan WHEN 'studio' THEN 2700 WHEN 'creator' THEN 1800 ELSE 180 END;
  ELSIF p_resource = 'export' THEN
    IF effective_plan = 'free' THEN
      period_start := date_trunc('month', NOW());
      usage_limit := 3;
    ELSE
      period_start := date_trunc('day', NOW());
      usage_limit := 30;
    END IF;
  ELSE
    period_start := date_trunc('month', NOW());
    usage_limit := CASE WHEN effective_plan = 'studio' THEN 15 ELSE 0 END;
  END IF;

  SELECT COALESCE(SUM(amount), 0)::INTEGER INTO used_amount
  FROM public.usage_events
  WHERE user_id = p_user_id
    AND resource = p_resource
    AND created_at >= period_start;

  IF used_amount + p_amount > usage_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'plan', effective_plan,
      'used', used_amount,
      'limit', usage_limit,
      'period_start', period_start
    );
  END IF;

  INSERT INTO public.usage_events(user_id, resource, amount, reference_id)
  VALUES (p_user_id, p_resource, p_amount, p_reference_id);

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', effective_plan,
    'used', used_amount + p_amount,
    'limit', usage_limit,
    'period_start', period_start
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_usage(
  p_user_id UUID,
  p_resource TEXT,
  p_reference_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.usage_events
  WHERE user_id = p_user_id
    AND resource = p_resource
    AND reference_id = p_reference_id;
$$;

REVOKE ALL ON FUNCTION public.reserve_usage(UUID, TEXT, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_usage(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_usage(UUID, TEXT, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_usage(UUID, TEXT, UUID) TO service_role;
