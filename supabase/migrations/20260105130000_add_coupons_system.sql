-- Migration: Add coupons system
-- Description: Creates coupons table for discount management

-- Table: coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Coupon code (unique, uppercase)
  code VARCHAR(50) NOT NULL UNIQUE,

  -- Description for admin reference
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Discount type and value
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value INTEGER NOT NULL, -- percentage (0-100) or amount in cents

  -- Applicable currency (for fixed_amount type)
  currency VARCHAR(3) DEFAULT 'brl',

  -- Applicable plans (null = all plans)
  applicable_plans TEXT[] DEFAULT NULL, -- ['starter', 'creator', 'agency']

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Stripe coupon/promotion code IDs (if synced)
  stripe_coupon_id VARCHAR(100),
  stripe_promotion_code_id VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: coupon_uses - Track coupon usage
CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Order details
  plan_tier TEXT NOT NULL,
  original_price INTEGER NOT NULL, -- in cents
  discounted_price INTEGER NOT NULL, -- in cents
  discount_applied INTEGER NOT NULL, -- in cents

  -- Stripe reference
  stripe_checkout_session_id VARCHAR(100),

  used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate uses per user per coupon
  CONSTRAINT unique_user_coupon UNIQUE (coupon_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_user ON coupon_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON coupon_uses(coupon_id);

-- RLS Policies
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

-- Coupons: Anyone can read active coupons (for validation), admins can manage
CREATE POLICY "Anyone can read active coupons"
  ON coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Coupon uses: Users can see their own uses, admins can see all
CREATE POLICY "Users can see their own coupon uses"
  ON coupon_uses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage coupon uses"
  ON coupon_uses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_plan_tier TEXT,
  p_price_cents INTEGER
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  coupon_id UUID,
  discount_type TEXT,
  discount_value INTEGER,
  final_price INTEGER
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
  v_discount INTEGER;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM coupons c
  WHERE UPPER(c.code) = UPPER(p_code)
    AND c.is_active = true
  LIMIT 1;

  -- Check if coupon exists
  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false, 'Cupom não encontrado'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  -- Check validity period
  IF v_coupon.valid_from > NOW() THEN
    RETURN QUERY SELECT false, 'Cupom ainda não está válido'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN QUERY SELECT false, 'Cupom expirado'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  -- Check user usage
  SELECT COUNT(*) INTO v_user_uses
  FROM coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_uses >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'Você já usou este cupom'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  -- Check applicable plans
  IF v_coupon.applicable_plans IS NOT NULL AND NOT (p_plan_tier = ANY(v_coupon.applicable_plans)) THEN
    RETURN QUERY SELECT false, 'Cupom não válido para este plano'::TEXT, NULL::UUID, NULL::TEXT, NULL::INTEGER, p_price_cents;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := (p_price_cents * v_coupon.discount_value) / 100;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed price
  IF v_discount > p_price_cents THEN
    v_discount := p_price_cents;
  END IF;

  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    v_coupon.id,
    v_coupon.discount_type,
    v_coupon.discount_value,
    (p_price_cents - v_discount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record coupon use
CREATE OR REPLACE FUNCTION record_coupon_use(
  p_coupon_id UUID,
  p_user_id UUID,
  p_plan_tier TEXT,
  p_original_price INTEGER,
  p_discounted_price INTEGER,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert usage record
  INSERT INTO coupon_uses (coupon_id, user_id, plan_tier, original_price, discounted_price, discount_applied, stripe_checkout_session_id)
  VALUES (p_coupon_id, p_user_id, p_plan_tier, p_original_price, p_discounted_price, p_original_price - p_discounted_price, p_stripe_session_id)
  ON CONFLICT (coupon_id, user_id) DO NOTHING;

  -- Increment usage counter
  UPDATE coupons SET current_uses = current_uses + 1 WHERE id = p_coupon_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some example coupons
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_uses, valid_until)
VALUES
  ('WELCOME50', 'Boas-vindas 50%', 'Cupom de boas-vindas com 50% de desconto', 'percentage', 50, 100, NOW() + INTERVAL '3 months'),
  ('CREATOR20', 'Creator 20% OFF', '20% de desconto no plano Creator', 'percentage', 20, NULL, NOW() + INTERVAL '1 year')
ON CONFLICT (code) DO NOTHING;
