-- Migration: Add public subscriber count function
-- This function allows anonymous users to get the count of active subscriptions
-- without exposing any sensitive data (only returns a number)

-- Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_active_subscriber_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscriber_count INTEGER;
BEGIN
  -- Count active subscriptions for creator and agency tiers
  SELECT COUNT(*)::INTEGER INTO subscriber_count
  FROM public.subscriptions
  WHERE tier IN ('creator', 'agency')
    AND status = 'active';

  RETURN COALESCE(subscriber_count, 0);
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_subscriber_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_subscriber_count() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_active_subscriber_count() IS 'Returns the count of active creator and agency subscriptions. Safe for public access as it only returns a count.';
