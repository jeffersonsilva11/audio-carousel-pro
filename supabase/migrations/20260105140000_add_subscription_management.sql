-- Migration: Add subscription management and notifications
-- Description: Adds support for cancellation tracking, payment failure handling, and notifications

-- Add new columns to subscriptions table for cancellation tracking
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_failure TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_downgrade_tier TEXT;

-- Table: notifications - User notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL, -- subscription_cancelled, payment_failed, plan_downgraded, etc.
  title_pt TEXT NOT NULL,
  title_en TEXT,
  title_es TEXT,
  message_pt TEXT NOT NULL,
  message_en TEXT,
  message_es TEXT,

  -- Metadata
  data JSONB DEFAULT '{}',

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Action (optional)
  action_url TEXT,
  action_label_pt TEXT,
  action_label_en TEXT,
  action_label_es TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Auto-delete after this date
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel ON subscriptions(cancel_at_period_end, current_period_end);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can see their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can manage all notifications
CREATE POLICY "Service can manage notifications"
  ON notifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title_pt TEXT,
  p_message_pt TEXT,
  p_title_en TEXT DEFAULT NULL,
  p_title_es TEXT DEFAULT NULL,
  p_message_en TEXT DEFAULT NULL,
  p_message_es TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL,
  p_action_label_pt TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type,
    title_pt, title_en, title_es,
    message_pt, message_en, message_es,
    data, action_url, action_label_pt,
    expires_at
  ) VALUES (
    p_user_id, p_type,
    p_title_pt, p_title_en, p_title_es,
    p_message_pt, p_message_en, p_message_es,
    p_data, p_action_url, p_action_label_pt,
    NOW() + (p_expires_in_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should be downgraded after payment failures
CREATE OR REPLACE FUNCTION check_payment_failure_downgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If 3+ failed payments and last failure was more than 1 day ago
  IF NEW.failed_payment_count >= 3 AND
     NEW.last_payment_failure < NOW() - INTERVAL '1 day' AND
     NEW.plan_tier != 'free' THEN

    -- Schedule downgrade
    NEW.scheduled_downgrade_tier := 'free';

    -- Create notification
    PERFORM create_notification(
      NEW.user_id,
      'plan_downgraded',
      'Sua assinatura foi cancelada',
      'Devido a falhas no pagamento, sua assinatura foi cancelada automaticamente. Você foi movido para o plano gratuito.',
      'Your subscription has been cancelled',
      'Su suscripción ha sido cancelada',
      'Due to payment failures, your subscription has been automatically cancelled. You have been moved to the free plan.',
      'Debido a fallos en el pago, su suscripción ha sido cancelada automáticamente. Ha sido movido al plan gratuito.',
      jsonb_build_object('previous_plan', NEW.plan_tier, 'failed_payments', NEW.failed_payment_count),
      '/dashboard',
      'Ver planos'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment failure downgrade check
DROP TRIGGER IF EXISTS check_payment_failure_trigger ON subscriptions;
CREATE TRIGGER check_payment_failure_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.failed_payment_count IS DISTINCT FROM NEW.failed_payment_count)
  EXECUTE FUNCTION check_payment_failure_downgrade();

-- Function to get remaining subscription days
CREATE OR REPLACE FUNCTION get_subscription_remaining_days(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_end_date TIMESTAMPTZ;
  v_days INTEGER;
BEGIN
  SELECT current_period_end INTO v_end_date
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF v_end_date IS NULL THEN
    RETURN 0;
  END IF;

  v_days := EXTRACT(DAY FROM (v_end_date - NOW()));

  IF v_days < 0 THEN
    RETURN 0;
  END IF;

  RETURN v_days;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled downgrades (run via cron)
CREATE OR REPLACE FUNCTION process_scheduled_downgrades()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_sub RECORD;
BEGIN
  FOR v_sub IN
    SELECT * FROM subscriptions
    WHERE scheduled_downgrade_tier IS NOT NULL
    AND (current_period_end < NOW() OR failed_payment_count >= 3)
  LOOP
    UPDATE subscriptions
    SET
      plan_tier = scheduled_downgrade_tier,
      daily_limit = CASE scheduled_downgrade_tier
        WHEN 'free' THEN 1
        WHEN 'starter' THEN 1
        WHEN 'creator' THEN 8
        WHEN 'agency' THEN 20
        ELSE 1
      END,
      has_watermark = (scheduled_downgrade_tier = 'free'),
      has_editor = (scheduled_downgrade_tier != 'free'),
      has_history = (scheduled_downgrade_tier != 'free'),
      scheduled_downgrade_tier = NULL,
      status = CASE
        WHEN scheduled_downgrade_tier = 'free' AND cancel_at_period_end THEN 'cancelled'
        ELSE status
      END
    WHERE id = v_sub.id;

    UPDATE profiles
    SET plan_tier = v_sub.scheduled_downgrade_tier
    WHERE user_id = v_sub.user_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired notifications (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
