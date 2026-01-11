-- Migration: Add cover_solid_color template type
-- Description: Adds the missing cover_solid_color enum value that is required by the frontend
-- This fixes the 400 Bad Request error when creating carousels

-- ============================================================================
-- ADD MISSING ENUM VALUE
-- ============================================================================

-- Add cover_solid_color to the cover_template_type enum
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction in some cases,
-- but Supabase migrations handle this properly
ALTER TYPE cover_template_type ADD VALUE IF NOT EXISTS 'cover_solid_color';

-- ============================================================================
-- UPDATE PLANS CONFIG
-- ============================================================================

-- Update free plan to use cover_solid_color as the only available template
UPDATE plans_config SET
  available_cover_templates = ARRAY['cover_solid_color']::TEXT[]
WHERE tier = 'free';

-- Update starter plan to use cover_solid_color as the only available template
UPDATE plans_config SET
  available_cover_templates = ARRAY['cover_solid_color']::TEXT[]
WHERE tier = 'starter';

-- Update creator plan to include cover_solid_color
UPDATE plans_config SET
  available_cover_templates = ARRAY['cover_solid_color', 'cover_full_image', 'cover_split_images', 'cover_gradient_overlay']::TEXT[]
WHERE tier = 'creator';

-- Update agency plan to include cover_solid_color
UPDATE plans_config SET
  available_cover_templates = ARRAY['cover_solid_color', 'cover_full_image', 'cover_split_images', 'cover_gradient_overlay']::TEXT[]
WHERE tier = 'agency';

-- ============================================================================
-- ADD TEMPLATE PRESET
-- ============================================================================

-- Add the cover_solid_color preset template
INSERT INTO template_presets (
  slug,
  name,
  category,
  cover_type,
  name_pt,
  name_en,
  name_es,
  description_pt,
  description_en,
  description_es,
  min_plan_tier,
  is_active,
  is_featured,
  display_order,
  config
)
VALUES (
  'cover-solid-color',
  'Solid Color Cover',
  'cover',
  'cover_solid_color',
  'Cor Sólida',
  'Solid Color',
  'Color Sólido',
  'Fundo de cor sólida com texto, sem necessidade de imagem',
  'Solid color background with text, no image required',
  'Fondo de color sólido con texto, sin necesidad de imagen',
  'free',
  true,
  true,
  0,  -- First in order since it's the default
  '{
    "backgroundColor": "#000000",
    "textColor": "#FFFFFF",
    "accentColor": "#FF6B00",
    "fontFamily": "Inter",
    "headerStyle": "default",
    "footerStyle": "default",
    "textPosition": "center",
    "contentPadding": 40
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  cover_type = EXCLUDED.cover_type,
  name_pt = EXCLUDED.name_pt,
  name_en = EXCLUDED.name_en,
  name_es = EXCLUDED.name_es,
  description_pt = EXCLUDED.description_pt,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  min_plan_tier = EXCLUDED.min_plan_tier,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  display_order = EXCLUDED.display_order,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================================================
-- UPDATE DEFAULT VALUE
-- ============================================================================

-- Update the default value for cover_template column to cover_solid_color
ALTER TABLE carousels
ALTER COLUMN cover_template SET DEFAULT 'cover_solid_color';
