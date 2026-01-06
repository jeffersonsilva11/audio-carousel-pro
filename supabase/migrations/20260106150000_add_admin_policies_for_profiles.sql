-- Add RLS policies to allow admins to view all profiles
-- This is needed for the admin panel to display users in Users, Roles, and Subscriptions sections

-- First, create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policies
-- Users can view their own profile OR admins can view all
CREATE POLICY "Users can view own profile or admins all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id OR public.is_admin()
);

-- Ensure update and insert policies still work for users
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Grant execute on is_admin function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add index on user_roles for faster admin checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_admin ON public.user_roles(user_id) WHERE role = 'admin';
