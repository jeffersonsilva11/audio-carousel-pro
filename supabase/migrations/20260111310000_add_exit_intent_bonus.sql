-- Migration: Add exit intent bonus system (3 extra carousels for users who sign up via exit intent)

-- 1. Add bonus_carousels and signup_source to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bonus_carousels INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS signup_source TEXT;

-- 2. Create index for signup_source analytics
CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON profiles(signup_source) WHERE signup_source IS NOT NULL;

-- 3. Update handle_new_user function to include signup_source and bonus carousels
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  source_value TEXT;
  bonus_value INTEGER := 0;
BEGIN
  -- Get signup source from user metadata
  source_value := new.raw_user_meta_data ->> 'signup_source';

  -- Grant bonus carousels for exit_intent signups
  IF source_value = 'exit_intent' THEN
    bonus_value := 3;
  END IF;

  INSERT INTO public.profiles (user_id, email, name, signup_source, bonus_carousels)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    COALESCE(source_value, 'direct'),
    bonus_value
  );
  RETURN new;
END;
$$;

-- 4. Function to use a bonus carousel (decrements bonus_carousels)
CREATE OR REPLACE FUNCTION use_bonus_carousel(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_bonus INTEGER;
BEGIN
  -- Get current bonus
  SELECT bonus_carousels INTO current_bonus
  FROM profiles
  WHERE id = p_user_id;

  -- If no bonus available, return false
  IF current_bonus IS NULL OR current_bonus <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Decrement bonus
  UPDATE profiles
  SET bonus_carousels = bonus_carousels - 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get user's bonus carousels
CREATE OR REPLACE FUNCTION get_bonus_carousels(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  bonus INTEGER;
BEGIN
  SELECT COALESCE(bonus_carousels, 0) INTO bonus
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(bonus, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add setting for exit intent bonus amount (configurable via admin)
INSERT INTO app_settings (key, value, description) VALUES
  ('exit_intent_bonus_carousels', '3', 'Number of bonus carousels granted to users who sign up via exit intent popup')
ON CONFLICT (key) DO NOTHING;

-- 7. Update existing leads table to link with profiles
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id) WHERE user_id IS NOT NULL;
