-- Migration: Add cover_solid_color enum value (Part 1)
-- Description: Adds the missing cover_solid_color enum value
-- IMPORTANT: New enum values must be committed before they can be used,
-- so this migration only adds the enum value. Part 2 uses it.

-- Add cover_solid_color to the cover_template_type enum
ALTER TYPE cover_template_type ADD VALUE IF NOT EXISTS 'cover_solid_color';
