-- Migration: Add subscription events tracking for churn analytics
-- Description: Tracks all subscription state changes for accurate churn/retention metrics

-- Create subscription_events table to log all subscription changes
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created',    -- New paid subscription
    'subscription_upgraded',   -- Upgrade (e.g., starter -> creator)
    'subscription_downgraded', -- Downgrade (e.g., creator -> starter)
    'subscription_cancelled',  -- User cancelled (will end at period end)
    'subscription_expired',    -- Subscription period ended
    'subscription_reactivated',-- User reactivated after cancellation
    'subscription_churned',    -- User went from paid to free
    'retention_offer_accepted' -- User accepted retention offer
  )),

  -- Plan transition
  from_plan TEXT, -- Previous plan (null for new subscriptions)
  to_plan TEXT,   -- New plan (null for churned/expired)

  -- Revenue impact
  mrr_change DECIMAL(10,2) DEFAULT 0, -- Monthly revenue change (positive or negative)

  -- Additional context
  reason TEXT,           -- Cancellation reason if provided
  metadata JSONB,        -- Additional event data

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying (IF NOT EXISTS to allow re-running)
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_date ON subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_churn ON subscription_events(event_type, created_at)
  WHERE event_type IN ('subscription_churned', 'subscription_cancelled');

-- Enable RLS
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS to allow re-running)
DROP POLICY IF EXISTS "Users can view their own subscription events" ON subscription_events;
CREATE POLICY "Users can view their own subscription events"
ON subscription_events FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage subscription events" ON subscription_events;
CREATE POLICY "Service role can manage subscription events"
ON subscription_events FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to log subscription events
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_from_plan TEXT DEFAULT NULL,
  p_to_plan TEXT DEFAULT NULL,
  p_mrr_change DECIMAL DEFAULT 0,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    user_id, event_type, from_plan, to_plan, mrr_change, reason, metadata
  ) VALUES (
    p_user_id, p_event_type, p_from_plan, p_to_plan, p_mrr_change, p_reason, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Trigger function to automatically log subscription changes
CREATE OR REPLACE FUNCTION track_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_plan TEXT;
  v_new_plan TEXT;
  v_event_type TEXT;
  v_mrr_change DECIMAL;
  v_old_mrr DECIMAL;
  v_new_mrr DECIMAL;
BEGIN
  -- Get plan names
  v_old_plan := COALESCE(OLD.plan_tier, 'free');
  v_new_plan := COALESCE(NEW.plan_tier, 'free');

  -- Calculate MRR values (approximate)
  v_old_mrr := CASE v_old_plan
    WHEN 'starter' THEN 29.90
    WHEN 'creator' THEN 99.90
    WHEN 'agency' THEN 299.90
    ELSE 0
  END;

  v_new_mrr := CASE v_new_plan
    WHEN 'starter' THEN 29.90
    WHEN 'creator' THEN 99.90
    WHEN 'agency' THEN 299.90
    ELSE 0
  END;

  v_mrr_change := v_new_mrr - v_old_mrr;

  -- Determine event type based on changes

  -- New subscription (from free to paid)
  IF TG_OP = 'INSERT' AND v_new_plan != 'free' THEN
    v_event_type := 'subscription_created';

  -- Status changed to cancelled
  ELSIF TG_OP = 'UPDATE' AND
        NEW.cancel_at_period_end = true AND
        (OLD.cancel_at_period_end IS NULL OR OLD.cancel_at_period_end = false) THEN
    v_event_type := 'subscription_cancelled';
    v_mrr_change := 0; -- Not churned yet, just cancelled

  -- Subscription reactivated (cancel_at_period_end went from true to false)
  ELSIF TG_OP = 'UPDATE' AND
        NEW.cancel_at_period_end = false AND
        OLD.cancel_at_period_end = true THEN
    v_event_type := 'subscription_reactivated';

  -- Plan changed (upgrade or downgrade)
  ELSIF TG_OP = 'UPDATE' AND v_old_plan != v_new_plan THEN
    IF v_new_mrr > v_old_mrr THEN
      v_event_type := 'subscription_upgraded';
    ELSIF v_new_mrr < v_old_mrr AND v_new_plan != 'free' THEN
      v_event_type := 'subscription_downgraded';
    ELSIF v_new_plan = 'free' AND v_old_plan != 'free' THEN
      v_event_type := 'subscription_churned';
    ELSE
      RETURN NEW; -- No significant change
    END IF;

  -- Status changed to expired/inactive
  ELSIF TG_OP = 'UPDATE' AND
        NEW.status IN ('cancelled', 'expired', 'inactive') AND
        OLD.status = 'active' AND
        v_old_plan != 'free' THEN
    v_event_type := 'subscription_expired';
    v_mrr_change := -v_old_mrr;

  ELSE
    -- No event to log
    RETURN NEW;
  END IF;

  -- Log the event
  PERFORM log_subscription_event(
    NEW.user_id,
    v_event_type,
    v_old_plan,
    v_new_plan,
    v_mrr_change,
    NULL,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'stripe_subscription_id', NEW.stripe_subscription_id
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on subscriptions table
DROP TRIGGER IF EXISTS track_subscription_changes_trigger ON subscriptions;
CREATE TRIGGER track_subscription_changes_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION track_subscription_changes();

-- Backfill existing data: Log current cancelled subscriptions (only if not already backfilled)
INSERT INTO subscription_events (user_id, event_type, from_plan, to_plan, mrr_change, created_at, metadata)
SELECT
  s.user_id,
  'subscription_cancelled',
  s.plan_tier,
  s.plan_tier, -- Still same plan, just cancelled
  0,
  COALESCE(s.cancelled_at, s.updated_at),
  jsonb_build_object('backfilled', true, 'status', s.status)
FROM subscriptions s
WHERE s.cancel_at_period_end = true
  AND s.cancelled_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subscription_events se
    WHERE se.user_id = s.user_id
      AND se.event_type = 'subscription_cancelled'
      AND se.metadata->>'backfilled' = 'true'
  );

-- Add comments
COMMENT ON TABLE subscription_events IS 'Tracks all subscription state changes for churn/retention analytics';
COMMENT ON COLUMN subscription_events.event_type IS 'Type of subscription event';
COMMENT ON COLUMN subscription_events.mrr_change IS 'Monthly recurring revenue impact of this event';
