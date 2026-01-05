-- Migration to fix Supabase linter warnings
-- Fixes: function_search_path_mutable, auth_rls_initplan

-- ============================================
-- FIX 1: Function Search Path Security
-- Set explicit search_path for all functions
-- ============================================

-- Drop existing functions first (required when changing return type)
DROP FUNCTION IF EXISTS public.get_active_manual_subscription(uuid);
DROP FUNCTION IF EXISTS public.validate_coupon(text);

-- Fix get_active_manual_subscription function
CREATE OR REPLACE FUNCTION public.get_active_manual_subscription(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan_tier text,
  starts_at timestamptz,
  expires_at timestamptz,
  granted_by uuid,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.user_id,
    ms.plan_tier,
    ms.starts_at,
    ms.expires_at,
    ms.granted_by,
    ms.notes,
    ms.created_at
  FROM public.manual_subscriptions ms
  WHERE ms.user_id = p_user_id
    AND ms.starts_at <= NOW()
    AND ms.expires_at > NOW()
  ORDER BY ms.expires_at DESC
  LIMIT 1;
END;
$$;

-- Fix validate_coupon function
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_percent integer,
  discount_amount numeric,
  plan_tier text,
  valid boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon record;
BEGIN
  SELECT c.* INTO v_coupon
  FROM public.coupons c
  WHERE UPPER(c.code) = UPPER(p_code)
    AND c.active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, NULL::integer, NULL::numeric, NULL::text,
      false, 'Cupom nao encontrado'::text;
    RETURN;
  END IF;

  -- Check expiration
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN QUERY SELECT
      v_coupon.id, v_coupon.code, v_coupon.discount_percent, v_coupon.discount_amount, v_coupon.plan_tier,
      false, 'Cupom expirado'::text;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_coupon.max_uses IS NOT NULL THEN
    DECLARE
      v_usage_count integer;
    BEGIN
      SELECT COUNT(*) INTO v_usage_count
      FROM public.coupon_uses cu
      WHERE cu.coupon_id = v_coupon.id;

      IF v_usage_count >= v_coupon.max_uses THEN
        RETURN QUERY SELECT
          v_coupon.id, v_coupon.code, v_coupon.discount_percent, v_coupon.discount_amount, v_coupon.plan_tier,
          false, 'Cupom esgotado'::text;
        RETURN;
      END IF;
    END;
  END IF;

  RETURN QUERY SELECT
    v_coupon.id, v_coupon.code, v_coupon.discount_percent, v_coupon.discount_amount, v_coupon.plan_tier,
    true, 'Cupom valido'::text;
END;
$$;

-- Fix record_coupon_use function
CREATE OR REPLACE FUNCTION public.record_coupon_use(
  p_coupon_id uuid,
  p_user_id uuid,
  p_subscription_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coupon_uses (coupon_id, user_id, subscription_id)
  VALUES (p_coupon_id, p_user_id, p_subscription_id);
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- FIX 2: RLS Policies Performance
-- Replace auth.uid() with (select auth.uid())
-- ============================================

-- Helper function to check if user is admin (cached per query)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- ============================================
-- CAROUSELS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own carousels" ON public.carousels;
CREATE POLICY "Users can view their own carousels" ON public.carousels
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own carousels" ON public.carousels;
CREATE POLICY "Users can insert their own carousels" ON public.carousels
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own carousels" ON public.carousels;
CREATE POLICY "Users can update their own carousels" ON public.carousels
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own carousels" ON public.carousels;
CREATE POLICY "Users can delete their own carousels" ON public.carousels
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- USER_ROLES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;
-- Keep system policy but optimize it
CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true);

-- ============================================
-- DAILY_USAGE TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own usage" ON public.daily_usage;
CREATE POLICY "Users can view their own usage" ON public.daily_usage
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own usage" ON public.daily_usage;
CREATE POLICY "Users can update their own usage" ON public.daily_usage
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can increment their own usage" ON public.daily_usage;
CREATE POLICY "Users can increment their own usage" ON public.daily_usage
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- CUSTOM_TEMPLATES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own templates" ON public.custom_templates;
CREATE POLICY "Users can view their own templates" ON public.custom_templates
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own templates" ON public.custom_templates;
CREATE POLICY "Users can create their own templates" ON public.custom_templates
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own templates" ON public.custom_templates;
CREATE POLICY "Users can update their own templates" ON public.custom_templates
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.custom_templates;
CREATE POLICY "Users can delete their own templates" ON public.custom_templates
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ============================================
-- MANUAL_SUBSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own manual subscription" ON public.manual_subscriptions;
CREATE POLICY "Users can view their own manual subscription" ON public.manual_subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Admins can manage manual subscriptions" ON public.manual_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================
-- API_USAGE TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own API usage" ON public.api_usage;
CREATE POLICY "Users can view their own API usage" ON public.api_usage
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all API usage" ON public.api_usage;
CREATE POLICY "Admins can view all API usage" ON public.api_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================
-- COUPON_USES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can see their own coupon uses" ON public.coupon_uses;
CREATE POLICY "Users can see their own coupon uses" ON public.coupon_uses
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage coupon uses" ON public.coupon_uses;
CREATE POLICY "Admins can manage coupon uses" ON public.coupon_uses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================
-- ADMIN-ONLY TABLES (with cached admin check)
-- ============================================

-- USAGE_LOGS
DROP POLICY IF EXISTS "Admins can view all logs" ON public.usage_logs;
CREATE POLICY "Admins can view all logs" ON public.usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- STRIPE_EVENTS
DROP POLICY IF EXISTS "Admins can view stripe events" ON public.stripe_events;
CREATE POLICY "Admins can view stripe events" ON public.stripe_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- FEATURE_FLAGS
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- LANDING_CONTENT
DROP POLICY IF EXISTS "Admins can manage landing content" ON public.landing_content;
CREATE POLICY "Admins can manage landing content" ON public.landing_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- FAQS
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;
CREATE POLICY "Admins can manage FAQs" ON public.faqs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- TESTIMONIALS
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- TRUSTED_COMPANIES
DROP POLICY IF EXISTS "Admins can manage trusted companies" ON public.trusted_companies;
CREATE POLICY "Admins can manage trusted companies" ON public.trusted_companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- PLANS_CONFIG
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans_config;
CREATE POLICY "Admins can manage plans" ON public.plans_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- COUPONS
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- APP_SETTINGS
DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
CREATE POLICY "Admins can insert settings" ON public.app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete settings" ON public.app_settings;
CREATE POLICY "Admins can delete settings" ON public.app_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );
