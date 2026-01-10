-- Migration: Add default_content column to ai_prompts
-- This stores the original prompt value for reset functionality

-- Add default_content column
ALTER TABLE public.ai_prompts
ADD COLUMN IF NOT EXISTS default_content TEXT;

-- Update existing rows to copy content to default_content
UPDATE public.ai_prompts
SET default_content = content
WHERE default_content IS NULL;

-- Make default_content required for new rows
ALTER TABLE public.ai_prompts
ALTER COLUMN default_content SET NOT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.ai_prompts.default_content IS 'Original prompt content for reset functionality';
