-- Migration: Fix log_carousel_activity trigger function
-- Description: Fixes column name (full_name -> name) and join condition (id -> user_id)
-- The trigger was referencing non-existent 'full_name' column and using wrong join condition

-- Replace the trigger function with corrected version
CREATE OR REPLACE FUNCTION log_carousel_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  first_name TEXT;
BEGIN
  -- Get user's display name (using 'name' column and 'user_id' for join)
  SELECT name INTO user_name FROM profiles WHERE user_id = NEW.user_id;

  -- Extract first name and initial
  IF user_name IS NOT NULL AND user_name != '' THEN
    first_name := split_part(user_name, ' ', 1);
    IF length(user_name) > length(first_name) THEN
      first_name := first_name || ' ' || left(split_part(user_name, ' ', 2), 1) || '.';
    END IF;
  ELSE
    first_name := 'Alguém';
  END IF;

  -- Insert activity
  INSERT INTO activity_feed (user_id, activity_type, display_name, metadata)
  VALUES (NEW.user_id, 'carousel_created', first_name, jsonb_build_object('carousel_id', NEW.id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger itself doesn't need to be recreated, only the function
