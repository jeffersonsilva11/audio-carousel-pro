-- Migration: Add template system for carousel layouts
-- Description: Creates template presets, user templates, and carousel slide images tables

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Cover template types
CREATE TYPE cover_template_type AS ENUM (
  'cover_full_image',      -- Full background image with text overlay
  'cover_split_images',    -- Split layout with multiple images
  'cover_gradient_overlay' -- Gradient overlay on background image
);

-- Content template types
CREATE TYPE content_template_type AS ENUM (
  'content_image_top',   -- Image at top, text below
  'content_text_top',    -- Text at top, image below
  'content_split',       -- 50/50 split (image left, text right)
  'content_text_only'    -- Text only, no image
);

-- Template category
CREATE TYPE template_category AS ENUM (
  'cover',    -- Cover/first slide templates
  'content'   -- Content/body slide templates
);

-- ============================================================================
-- TABLE: template_presets
-- System-defined preset templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  category template_category NOT NULL,

  -- Template type (one will be NULL based on category)
  cover_type cover_template_type,
  content_type content_template_type,

  -- Names by language
  name_pt VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_es VARCHAR(100),

  -- Descriptions by language
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,

  -- Visual configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Config structure for covers:
  -- {
  --   "backgroundColor": "#000000",
  --   "textColor": "#FFFFFF",
  --   "accentColor": "#FF6B00",
  --   "gradientColors": ["#000000", "#333333"],
  --   "fontFamily": "Inter",
  --   "headerStyle": "default|minimal|bold",
  --   "footerStyle": "default|minimal|none",
  --   "imageOpacity": 0.8,
  --   "overlayGradient": "linear-gradient(...)"
  -- }

  -- Preview image (thumbnail for selection UI)
  preview_image_url TEXT,

  -- Plan requirements
  min_plan_tier TEXT NOT NULL DEFAULT 'creator' CHECK (min_plan_tier IN ('free', 'starter', 'creator', 'agency')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_cover_type CHECK (
    (category = 'cover' AND cover_type IS NOT NULL AND content_type IS NULL) OR
    (category = 'content' AND content_type IS NOT NULL AND cover_type IS NULL)
  )
);

-- ============================================================================
-- TABLE: user_templates
-- User-saved custom templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(100) NOT NULL,
  category template_category NOT NULL,

  -- Template type (one will be NULL based on category)
  cover_type cover_template_type,
  content_type content_template_type,

  -- Based on preset (optional)
  preset_id UUID REFERENCES template_presets(id) ON DELETE SET NULL,

  -- Visual configuration (same structure as presets)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Preview (auto-generated thumbnail)
  preview_image_url TEXT,

  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_user_cover_type CHECK (
    (category = 'cover' AND cover_type IS NOT NULL AND content_type IS NULL) OR
    (category = 'content' AND content_type IS NOT NULL AND cover_type IS NULL)
  )
);

-- ============================================================================
-- TABLE: carousel_slide_images
-- User-uploaded images for specific slides
-- ============================================================================

CREATE TABLE IF NOT EXISTS carousel_slide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,

  -- Slide identification
  slide_index INTEGER NOT NULL CHECK (slide_index >= 0),

  -- Image storage
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(50),

  -- Image dimensions
  width INTEGER,
  height INTEGER,

  -- Position for split layouts (when multiple images per slide)
  position VARCHAR(20) DEFAULT 'main' CHECK (position IN ('main', 'left', 'right', 'top', 'bottom')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique image per slide position
  CONSTRAINT unique_slide_image_position UNIQUE (carousel_id, slide_index, position)
);

-- ============================================================================
-- ALTER: carousels table
-- Add template-related columns
-- ============================================================================

ALTER TABLE carousels
ADD COLUMN IF NOT EXISTS cover_template cover_template_type DEFAULT 'cover_full_image',
ADD COLUMN IF NOT EXISTS content_template content_template_type DEFAULT 'content_text_only',
ADD COLUMN IF NOT EXISTS cover_preset_id UUID REFERENCES template_presets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_preset_id UUID REFERENCES template_presets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_custom_images BOOLEAN DEFAULT false;

-- ============================================================================
-- ALTER: plans_config table
-- Add template feature flags
-- ============================================================================

ALTER TABLE plans_config
ADD COLUMN IF NOT EXISTS has_cover_templates BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_content_templates BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_custom_colors BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_image_upload BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_templates_saved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_cover_templates TEXT[] DEFAULT ARRAY['cover_full_image']::TEXT[],
ADD COLUMN IF NOT EXISTS available_content_templates TEXT[] DEFAULT ARRAY['content_text_only']::TEXT[];

-- Update existing plans with template features
UPDATE plans_config SET
  has_cover_templates = false,
  has_content_templates = false,
  has_custom_colors = false,
  has_image_upload = false,
  max_templates_saved = 0,
  available_cover_templates = ARRAY['cover_full_image']::TEXT[],
  available_content_templates = ARRAY['content_text_only']::TEXT[]
WHERE tier = 'free';

UPDATE plans_config SET
  has_cover_templates = false,
  has_content_templates = false,
  has_custom_colors = false,
  has_image_upload = false,
  max_templates_saved = 0,
  available_cover_templates = ARRAY['cover_full_image']::TEXT[],
  available_content_templates = ARRAY['content_text_only']::TEXT[]
WHERE tier = 'starter';

UPDATE plans_config SET
  has_cover_templates = true,
  has_content_templates = true,
  has_custom_colors = true,
  has_image_upload = true,
  max_templates_saved = 10,
  available_cover_templates = ARRAY['cover_full_image', 'cover_split_images', 'cover_gradient_overlay']::TEXT[],
  available_content_templates = ARRAY['content_image_top', 'content_text_top', 'content_split', 'content_text_only']::TEXT[]
WHERE tier = 'creator';

UPDATE plans_config SET
  has_cover_templates = true,
  has_content_templates = true,
  has_custom_colors = true,
  has_image_upload = true,
  max_templates_saved = 50,
  available_cover_templates = ARRAY['cover_full_image', 'cover_split_images', 'cover_gradient_overlay']::TEXT[],
  available_content_templates = ARRAY['content_image_top', 'content_text_top', 'content_split', 'content_text_only']::TEXT[]
WHERE tier = 'agency';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_template_presets_category ON template_presets(category);
CREATE INDEX IF NOT EXISTS idx_template_presets_active ON template_presets(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_template_presets_plan ON template_presets(min_plan_tier);

CREATE INDEX IF NOT EXISTS idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_category ON user_templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_templates_favorite ON user_templates(user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_carousel_slide_images_carousel ON carousel_slide_images(carousel_id);
CREATE INDEX IF NOT EXISTS idx_carousel_slide_images_slide ON carousel_slide_images(carousel_id, slide_index);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Template presets: read by all active users, write by admins
ALTER TABLE template_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active template presets"
  ON template_presets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage template presets"
  ON template_presets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- User templates: users manage their own
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON user_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON user_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON user_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON user_templates FOR DELETE
  USING (user_id = auth.uid());

-- Carousel slide images: users manage their own
ALTER TABLE carousel_slide_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carousel images"
  ON carousel_slide_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carousels
      WHERE carousels.id = carousel_slide_images.carousel_id
      AND carousels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create images for their carousels"
  ON carousel_slide_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carousels
      WHERE carousels.id = carousel_slide_images.carousel_id
      AND carousels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own carousel images"
  ON carousel_slide_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carousels
      WHERE carousels.id = carousel_slide_images.carousel_id
      AND carousels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own carousel images"
  ON carousel_slide_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carousels
      WHERE carousels.id = carousel_slide_images.carousel_id
      AND carousels.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_template_presets_updated_at
  BEFORE UPDATE ON template_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_templates_updated_at
  BEFORE UPDATE ON user_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INSERT: Default template presets
-- ============================================================================

-- Cover templates
INSERT INTO template_presets (slug, name, category, cover_type, name_pt, name_en, name_es, description_pt, description_en, description_es, min_plan_tier, is_active, is_featured, display_order, config)
VALUES
  (
    'cover-full-image',
    'Full Image Cover',
    'cover',
    'cover_full_image',
    'Imagem Completa',
    'Full Image',
    'Imagen Completa',
    'Imagem de fundo cobrindo todo o slide com texto sobreposto',
    'Full background image with overlaid text',
    'Imagen de fondo cubriendo todo el slide con texto superpuesto',
    'creator',
    true,
    true,
    1,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "default",
      "footerStyle": "default",
      "imageOpacity": 0.7,
      "textShadow": true,
      "textPosition": "center"
    }'::jsonb
  ),
  (
    'cover-split-images',
    'Split Images Cover',
    'cover',
    'cover_split_images',
    'Imagens Divididas',
    'Split Images',
    'Imágenes Divididas',
    'Layout com múltiplas imagens em grid',
    'Layout with multiple images in grid',
    'Diseño con múltiples imágenes en grid',
    'creator',
    true,
    false,
    2,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "minimal",
      "footerStyle": "minimal",
      "gridLayout": "2x2",
      "imageBorderRadius": 8,
      "imageGap": 8
    }'::jsonb
  ),
  (
    'cover-gradient-overlay',
    'Gradient Overlay Cover',
    'cover',
    'cover_gradient_overlay',
    'Gradiente Sobreposto',
    'Gradient Overlay',
    'Gradiente Superpuesto',
    'Imagem com gradiente colorido sobreposto',
    'Image with colorful gradient overlay',
    'Imagen con gradiente colorido superpuesto',
    'creator',
    true,
    false,
    3,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "default",
      "footerStyle": "default",
      "gradientColors": ["rgba(255,107,0,0.8)", "rgba(0,0,0,0.9)"],
      "gradientDirection": "to bottom",
      "imageOpacity": 0.5
    }'::jsonb
  );

-- Content templates
INSERT INTO template_presets (slug, name, category, content_type, name_pt, name_en, name_es, description_pt, description_en, description_es, min_plan_tier, is_active, is_featured, display_order, config)
VALUES
  (
    'content-text-only',
    'Text Only Content',
    'content',
    'content_text_only',
    'Apenas Texto',
    'Text Only',
    'Solo Texto',
    'Slide com fundo sólido ou gradiente, apenas texto',
    'Slide with solid or gradient background, text only',
    'Slide con fondo sólido o gradiente, solo texto',
    'free',
    true,
    true,
    1,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "default",
      "footerStyle": "default",
      "textAlignment": "left",
      "contentPadding": 40
    }'::jsonb
  ),
  (
    'content-image-top',
    'Image Top Content',
    'content',
    'content_image_top',
    'Imagem no Topo',
    'Image Top',
    'Imagen Arriba',
    'Imagem na parte superior, texto abaixo',
    'Image at top, text below',
    'Imagen arriba, texto abajo',
    'creator',
    true,
    false,
    2,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "minimal",
      "footerStyle": "default",
      "imageHeight": "40%",
      "imageBorderRadius": 0,
      "textAlignment": "left",
      "contentPadding": 32
    }'::jsonb
  ),
  (
    'content-text-top',
    'Text Top Content',
    'content',
    'content_text_top',
    'Texto no Topo',
    'Text Top',
    'Texto Arriba',
    'Texto na parte superior, imagem abaixo',
    'Text at top, image below',
    'Texto arriba, imagen abajo',
    'creator',
    true,
    false,
    3,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "default",
      "footerStyle": "minimal",
      "imageHeight": "40%",
      "imageBorderRadius": 0,
      "textAlignment": "left",
      "contentPadding": 32
    }'::jsonb
  ),
  (
    'content-split',
    'Split Content',
    'content',
    'content_split',
    'Dividido 50/50',
    'Split 50/50',
    'Dividido 50/50',
    'Imagem à esquerda, texto à direita (50/50)',
    'Image on left, text on right (50/50)',
    'Imagen a la izquierda, texto a la derecha (50/50)',
    'creator',
    true,
    true,
    4,
    '{
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B00",
      "fontFamily": "Inter",
      "headerStyle": "minimal",
      "footerStyle": "minimal",
      "splitRatio": "50/50",
      "imagePosition": "left",
      "imageBorderRadius": 0,
      "textAlignment": "left",
      "contentPadding": 24
    }'::jsonb
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get available templates for a user's plan
CREATE OR REPLACE FUNCTION get_available_templates(p_user_id UUID)
RETURNS TABLE (
  template_id UUID,
  slug VARCHAR,
  name VARCHAR,
  category template_category,
  cover_type cover_template_type,
  content_type content_template_type,
  config JSONB,
  preview_image_url TEXT,
  is_featured BOOLEAN
) AS $$
DECLARE
  v_plan_tier TEXT;
BEGIN
  -- Get user's plan tier
  SELECT COALESCE(
    (SELECT plan_tier FROM subscriptions WHERE user_id = p_user_id AND status = 'active' LIMIT 1),
    (SELECT plan_tier FROM manual_subscriptions WHERE user_id = p_user_id AND is_active = true AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1),
    'free'
  ) INTO v_plan_tier;

  -- Return templates available for this plan
  RETURN QUERY
  SELECT
    tp.id,
    tp.slug,
    tp.name_pt::VARCHAR AS name,
    tp.category,
    tp.cover_type,
    tp.content_type,
    tp.config,
    tp.preview_image_url,
    tp.is_featured
  FROM template_presets tp
  WHERE tp.is_active = true
    AND (
      tp.min_plan_tier = 'free'
      OR (tp.min_plan_tier = 'starter' AND v_plan_tier IN ('starter', 'creator', 'agency'))
      OR (tp.min_plan_tier = 'creator' AND v_plan_tier IN ('creator', 'agency'))
      OR (tp.min_plan_tier = 'agency' AND v_plan_tier = 'agency')
    )
  ORDER BY tp.category, tp.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use a specific template
CREATE OR REPLACE FUNCTION can_use_template(p_user_id UUID, p_template_slug VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_tier TEXT;
  v_min_plan_tier TEXT;
  v_plan_order TEXT[] := ARRAY['free', 'starter', 'creator', 'agency'];
BEGIN
  -- Get user's plan tier
  SELECT COALESCE(
    (SELECT plan_tier FROM subscriptions WHERE user_id = p_user_id AND status = 'active' LIMIT 1),
    (SELECT plan_tier FROM manual_subscriptions WHERE user_id = p_user_id AND is_active = true AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1),
    'free'
  ) INTO v_plan_tier;

  -- Get template's minimum plan tier
  SELECT min_plan_tier INTO v_min_plan_tier
  FROM template_presets
  WHERE slug = p_template_slug AND is_active = true;

  IF v_min_plan_tier IS NULL THEN
    RETURN false;
  END IF;

  -- Compare plan tiers
  RETURN array_position(v_plan_order, v_plan_tier) >= array_position(v_plan_order, v_min_plan_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_templates
  SET
    times_used = times_used + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
