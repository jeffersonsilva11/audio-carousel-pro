-- Migration: Add retention offer tracking
-- Description: Prevents users from abusing the 50% retention offer every month
-- Rule: User can only use the retention offer once per subscription lifecycle

-- Add retention offer tracking column to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS retention_offer_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retention_offer_discount INTEGER; -- Discount percentage applied (e.g., 50)

-- Add comment explaining the column
COMMENT ON COLUMN subscriptions.retention_offer_used_at IS 'Timestamp when the user accepted a retention offer. Used to prevent abuse - user can only get retention offer once.';
COMMENT ON COLUMN subscriptions.retention_offer_discount IS 'The discount percentage that was applied (e.g., 50 for 50% off)';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_retention_offer ON subscriptions(user_id, retention_offer_used_at) WHERE retention_offer_used_at IS NOT NULL;

-- Function to check if user can receive retention offer
CREATE OR REPLACE FUNCTION can_receive_retention_offer(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_used_at TIMESTAMPTZ;
BEGIN
  -- Check if user has already used retention offer
  SELECT retention_offer_used_at INTO v_offer_used_at
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- User can receive offer if they never used it before
  -- (retention_offer_used_at is NULL)
  RETURN v_offer_used_at IS NULL;
END;
$$;

-- Function to mark retention offer as used
CREATE OR REPLACE FUNCTION use_retention_offer(p_user_id UUID, p_discount INTEGER DEFAULT 50)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_receive BOOLEAN;
BEGIN
  -- Check if user can receive offer
  v_can_receive := can_receive_retention_offer(p_user_id);

  IF NOT v_can_receive THEN
    RETURN FALSE;
  END IF;

  -- Mark offer as used
  UPDATE subscriptions
  SET
    retention_offer_used_at = NOW(),
    retention_offer_discount = p_discount,
    -- Also reset cancel_at_period_end since they're staying
    cancel_at_period_end = FALSE,
    cancelled_at = NULL,
    scheduled_downgrade_tier = NULL
  WHERE user_id = p_user_id;

  -- Create notification
  PERFORM create_notification(
    p_user_id,
    'success',
    '🎉 Desconto aplicado!',
    'Seu desconto de ' || p_discount || '% será aplicado na próxima fatura. Obrigado por continuar conosco!',
    '🎉 Discount applied!',
    'Your ' || p_discount || '% discount will be applied to your next invoice. Thank you for staying with us!',
    '🎉 ¡Descuento aplicado!',
    'Tu descuento del ' || p_discount || '% se aplicará en tu próxima factura. ¡Gracias por quedarte con nosotros!',
    '/dashboard'
  );

  RETURN TRUE;
END;
$$;
