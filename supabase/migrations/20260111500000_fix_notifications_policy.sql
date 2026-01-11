-- Migration: Fix overly permissive notifications INSERT policy
-- Description: Restrict notification creation to admins or self-notifications only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a more restrictive policy
-- Only admins or the user themselves can create notifications for a user
CREATE POLICY "Admins or self can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR user_id = auth.uid()
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins or self can insert notifications" ON notifications IS
  'Only admins can create notifications for any user, or users can create notifications for themselves';
