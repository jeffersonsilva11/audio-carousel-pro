-- Add preference columns to profiles table for persistence
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_template text DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS default_text_mode text DEFAULT 'compact',
ADD COLUMN IF NOT EXISTS default_creative_tone text DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS default_slide_count_mode text DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS default_manual_slide_count integer DEFAULT 6;