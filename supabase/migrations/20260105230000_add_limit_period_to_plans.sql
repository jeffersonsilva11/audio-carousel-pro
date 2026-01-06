-- Migration: Add flexible limit period to plans
-- Description: Allows plans to have daily, weekly, or monthly limits

-- Add limit_period column to plans_config
ALTER TABLE plans_config ADD COLUMN IF NOT EXISTS limit_period TEXT NOT NULL DEFAULT 'daily' CHECK (limit_period IN ('daily', 'weekly', 'monthly'));

-- Update plans with new limit_period values:
-- Free: stays daily (1 per account total)
-- Starter: weekly (3 per week)
-- Creator: daily (1 per day)
-- Agency: daily (8 per day)

UPDATE plans_config SET limit_period = 'weekly', daily_limit = 3 WHERE tier = 'starter';
UPDATE plans_config SET limit_period = 'daily', daily_limit = 1 WHERE tier = 'creator';

-- Update features text for starter
UPDATE plans_config SET
  features_pt = '["3 carrosséis por semana", "Sem marca d''água", "Editor visual", "Histórico completo", "Download em ZIP", "Template fundo sólido"]'::jsonb,
  features_en = '["3 carousels per week", "No watermark", "Visual editor", "Complete history", "ZIP download", "Solid background template"]'::jsonb,
  features_es = '["3 carruseles por semana", "Sin marca de agua", "Editor visual", "Historial completo", "Descarga en ZIP", "Plantilla fondo sólido"]'::jsonb
WHERE tier = 'starter';

-- Update features text for creator
UPDATE plans_config SET
  features_pt = '["1 carrossel por dia", "Sem marca d''água", "Editor visual completo", "Customização de fontes", "Templates premium", "Upload de imagens por slide", "Processamento prioritário"]'::jsonb,
  features_en = '["1 carousel per day", "No watermark", "Full visual editor", "Font customization", "Premium templates", "Image upload per slide", "Priority processing"]'::jsonb,
  features_es = '["1 carrusel por día", "Sin marca de agua", "Editor visual completo", "Personalización de fuentes", "Plantillas premium", "Subida de imágenes por slide", "Procesamiento prioritario"]'::jsonb
WHERE tier = 'creator';

-- Create a function to calculate usage based on period
CREATE OR REPLACE FUNCTION get_period_usage(
  p_user_id UUID,
  p_period TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage INTEGER;
  v_start_date DATE;
BEGIN
  -- Calculate start date based on period
  CASE p_period
    WHEN 'daily' THEN
      v_start_date := CURRENT_DATE;
    WHEN 'weekly' THEN
      -- Start of current week (Monday)
      v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    WHEN 'monthly' THEN
      -- Start of current month
      v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE
      v_start_date := CURRENT_DATE;
  END CASE;

  -- Sum usage from start date to today
  SELECT COALESCE(SUM(carousels_created), 0)
  INTO v_usage
  FROM daily_usage
  WHERE user_id = p_user_id
    AND usage_date >= v_start_date
    AND usage_date <= CURRENT_DATE;

  RETURN v_usage;
END;
$$;

-- Add comment to the column
COMMENT ON COLUMN plans_config.limit_period IS 'Period for the carousel limit: daily, weekly, or monthly';
COMMENT ON COLUMN plans_config.daily_limit IS 'Number of carousels allowed per period (daily_limit is kept for compatibility, represents carousel_limit per limit_period)';
