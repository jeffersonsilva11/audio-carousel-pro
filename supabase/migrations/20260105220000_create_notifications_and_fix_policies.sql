-- Migration to create notifications table and fix RLS policies
-- Fixes: 406 errors on profiles/subscriptions, creates notifications table

-- ============================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title_pt text NOT NULL,
  title_en text,
  title_es text,
  message_pt text NOT NULL,
  message_en text,
  message_es text,
  action_url text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- System/Admin can insert notifications for any user
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- FIX: Profiles RLS Policies (use user_id, not id)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- FIX: Subscriptions RLS Policies
-- ============================================

-- Drop the overly permissive system policy
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own subscription (for new signups)
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.notifications TO anon;
