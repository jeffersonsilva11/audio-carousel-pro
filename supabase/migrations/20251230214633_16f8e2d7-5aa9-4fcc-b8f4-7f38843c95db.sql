-- Add date/time preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS time_format text DEFAULT '24h',
ADD COLUMN IF NOT EXISTS show_relative_time boolean DEFAULT true;