-- Migration: Add plans management tables
-- Description: Creates plans_config and manual_subscriptions tables for admin management

-- Table: plans_config
-- Stores configurable plan settings with multi-currency support
CREATE TABLE IF NOT EXISTS plans_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'starter', 'creator', 'agency')),

  -- Names by language
  name_pt VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_es VARCHAR(100),

  -- Descriptions by language
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,

  -- Prices in cents by currency
  price_brl INTEGER NOT NULL DEFAULT 0,
  price_usd INTEGER DEFAULT 0,
  price_eur INTEGER DEFAULT 0,

  -- Stripe Price IDs by currency
  stripe_price_id_brl VARCHAR(100),
  stripe_price_id_usd VARCHAR(100),
  stripe_price_id_eur VARCHAR(100),

  -- Custom checkout links (optional, for Payment Links)
  checkout_link_brl VARCHAR(255),
  checkout_link_usd VARCHAR(255),
  checkout_link_eur VARCHAR(255),

  -- Plan limits and features
  daily_limit INTEGER NOT NULL DEFAULT 1,
  monthly_limit INTEGER,
  has_watermark BOOLEAN DEFAULT true,
  has_editor BOOLEAN DEFAULT false,
  has_history BOOLEAN DEFAULT false,
  has_zip_download BOOLEAN DEFAULT false,
  has_custom_fonts BOOLEAN DEFAULT false,
  has_gradients BOOLEAN DEFAULT false,
  has_slide_images BOOLEAN DEFAULT false,

  -- Features as JSON for flexibility
  features_pt JSONB DEFAULT '[]'::jsonb,
  features_en JSONB DEFAULT '[]'::jsonb,
  features_es JSONB DEFAULT '[]'::jsonb,

  -- Limitations as JSON
  limitations_pt JSONB DEFAULT '[]'::jsonb,
  limitations_en JSONB DEFAULT '[]'::jsonb,
  limitations_es JSONB DEFAULT '[]'::jsonb,

  -- Control
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: manual_subscriptions
-- Stores manually assigned subscriptions (influencers, testing, promotions)
CREATE TABLE IF NOT EXISTS manual_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'starter', 'creator', 'agency')),

  -- Reason for manual assignment
  reason VARCHAR(255),
  notes TEXT,

  -- Who granted this subscription
  granted_by UUID REFERENCES auth.users(id),

  -- Validity period
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent

  -- Custom overrides (optional)
  custom_daily_limit INTEGER,
  custom_features JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active manual subscription per user
  CONSTRAINT unique_active_manual_sub UNIQUE (user_id, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manual_subscriptions_user_id ON manual_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_subscriptions_active ON manual_subscriptions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_plans_config_tier ON plans_config(tier);

-- Insert default plan configurations
INSERT INTO plans_config (tier, name_pt, name_en, name_es, description_pt, description_en, description_es, price_brl, price_usd, daily_limit, has_watermark, has_editor, has_history, has_zip_download, has_custom_fonts, has_gradients, has_slide_images, display_order, features_pt, features_en, features_es, limitations_pt, limitations_en, limitations_es)
VALUES
  (
    'free',
    'Gratuito',
    'Free',
    'Gratis',
    'Experimente o Audisell',
    'Try Audisell',
    'Prueba Audisell',
    0,
    0,
    1,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    0,
    '["1 carrossel por conta", "Todos os tons de voz", "Template básico (fundo sólido)"]'::jsonb,
    '["1 carousel per account", "All voice tones", "Basic template (solid background)"]'::jsonb,
    '["1 carrusel por cuenta", "Todos los tonos de voz", "Plantilla básica (fondo sólido)"]'::jsonb,
    '["Com marca d''água", "Sem histórico", "Sem editor visual"]'::jsonb,
    '["With watermark", "No history", "No visual editor"]'::jsonb,
    '["Con marca de agua", "Sin historial", "Sin editor visual"]'::jsonb
  ),
  (
    'starter',
    'Starter',
    'Starter',
    'Starter',
    'Para criadores iniciantes',
    'For beginner creators',
    'Para creadores principiantes',
    2990,
    699,
    1,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    1,
    '["1 carrossel por dia", "Sem marca d''água", "Editor visual", "Histórico completo", "Download em ZIP", "Template fundo sólido"]'::jsonb,
    '["1 carousel per day", "No watermark", "Visual editor", "Complete history", "ZIP download", "Solid background template"]'::jsonb,
    '["1 carrusel por día", "Sin marca de agua", "Editor visual", "Historial completo", "Descarga en ZIP", "Plantilla fondo sólido"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ),
  (
    'creator',
    'Creator',
    'Creator',
    'Creator',
    'Para criadores sérios',
    'For serious creators',
    'Para creadores serios',
    9990,
    1999,
    8,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    2,
    '["Até 8 carrosséis por dia", "Uso ilimitado mensal (uso justo)", "Sem marca d''água", "Editor visual completo", "Customização de fontes", "Templates premium", "Upload de imagens por slide", "Processamento prioritário"]'::jsonb,
    '["Up to 8 carousels per day", "Unlimited monthly use (fair use)", "No watermark", "Full visual editor", "Font customization", "Premium templates", "Image upload per slide", "Priority processing"]'::jsonb,
    '["Hasta 8 carruseles por día", "Uso ilimitado mensual (uso justo)", "Sin marca de agua", "Editor visual completo", "Personalización de fuentes", "Plantillas premium", "Subida de imágenes por slide", "Procesamiento prioritario"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  ),
  (
    'agency',
    'Agency',
    'Agency',
    'Agency',
    'Para agências e times',
    'For agencies and teams',
    'Para agencias y equipos',
    19990,
    3999,
    20,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    3,
    '["Até 20 carrosséis por dia", "Customização avançada", "Todos os templates", "Suporte premium", "API de integração"]'::jsonb,
    '["Up to 20 carousels per day", "Advanced customization", "All templates", "Premium support", "Integration API"]'::jsonb,
    '["Hasta 20 carruseles por día", "Personalización avanzada", "Todas las plantillas", "Soporte premium", "API de integración"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )
ON CONFLICT (tier) DO NOTHING;

-- RLS Policies for plans_config (read by all, write by admins)
ALTER TABLE plans_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON plans_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON plans_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for manual_subscriptions (admins only)
ALTER TABLE manual_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manual subscriptions"
  ON manual_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own manual subscription"
  ON manual_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_plans_config_updated_at ON plans_config;
CREATE TRIGGER update_plans_config_updated_at
  BEFORE UPDATE ON plans_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manual_subscriptions_updated_at ON manual_subscriptions;
CREATE TRIGGER update_manual_subscriptions_updated_at
  BEFORE UPDATE ON manual_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has active manual subscription
CREATE OR REPLACE FUNCTION get_active_manual_subscription(p_user_id UUID)
RETURNS TABLE (
  plan_tier TEXT,
  daily_limit INTEGER,
  expires_at TIMESTAMPTZ,
  custom_features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.plan_tier,
    COALESCE(ms.custom_daily_limit, pc.daily_limit) as daily_limit,
    ms.expires_at,
    ms.custom_features
  FROM manual_subscriptions ms
  JOIN plans_config pc ON pc.tier = ms.plan_tier
  WHERE ms.user_id = p_user_id
    AND ms.is_active = true
    AND (ms.expires_at IS NULL OR ms.expires_at > NOW())
  ORDER BY ms.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
