-- Migration: Add missing landing content fields for admin sync
-- Description: Adds badge field for testimonials section that was missing

-- Add testimonials badge field
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('testimonials', 'badge', 'Casos de sucesso', 'Success Stories', 'Casos de éxito', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  updated_at = NOW();
