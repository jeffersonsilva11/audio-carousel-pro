-- Migration: Add email queue processing infrastructure
-- This enables automatic processing of email sequences

-- 1. Add sent_emails table to track what was sent (for debugging and analytics)
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES email_sequence_enrollments(id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_key TEXT,
  step_order INTEGER,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status);

-- 2. RLS for sent_emails
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sent emails" ON sent_emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 3. Function to get enrollment stats for admin dashboard
CREATE OR REPLACE FUNCTION get_email_sequence_stats()
RETURNS TABLE (
  total_enrolled BIGINT,
  active_enrollments BIGINT,
  completed_enrollments BIGINT,
  converted_enrollments BIGINT,
  emails_sent_today BIGINT,
  emails_sent_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM email_sequence_enrollments)::BIGINT as total_enrolled,
    (SELECT COUNT(*) FROM email_sequence_enrollments WHERE status = 'active')::BIGINT as active_enrollments,
    (SELECT COUNT(*) FROM email_sequence_enrollments WHERE status = 'completed')::BIGINT as completed_enrollments,
    (SELECT COUNT(*) FROM email_sequence_enrollments WHERE status = 'converted')::BIGINT as converted_enrollments,
    (SELECT COUNT(*) FROM sent_emails WHERE sent_at >= CURRENT_DATE)::BIGINT as emails_sent_today,
    (SELECT COUNT(*) FROM sent_emails WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as emails_sent_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add preferred_language to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'pt-BR';
  END IF;
END $$;

-- =====================================================
-- CRON JOB SETUP INSTRUCTIONS
-- =====================================================
--
-- To enable automatic email queue processing, you need to set up a cron job
-- in Supabase. There are two options:
--
-- OPTION 1: Using pg_cron (Supabase Pro plan required)
-- Run this in the SQL Editor after enabling pg_cron extension:
--
-- SELECT cron.schedule(
--   'process-email-queue',
--   '*/5 * * * *',  -- Every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/process-email-queue',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- OPTION 2: Using external cron service (free alternative)
-- Set up a cron job on services like:
-- - Vercel Cron (if using Vercel)
-- - Railway Cron
-- - GitHub Actions scheduled workflow
-- - Easycron.com
-- - cron-job.org
--
-- The endpoint to call:
-- POST https://[YOUR_PROJECT_REF].supabase.co/functions/v1/process-email-queue
-- Headers:
--   Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]
--   Content-Type: application/json
--
-- OPTION 3: Manual trigger from admin panel
-- You can also add a button in the admin panel to manually trigger
-- the queue processing for testing purposes.
-- =====================================================

-- 5. Add function to manually process queue (useful for testing)
CREATE OR REPLACE FUNCTION trigger_email_queue_processing()
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- This is a placeholder that can be called from admin panel
  -- The actual processing happens via the edge function
  RETURN 'Queue processing should be triggered via edge function';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin check is in the edge function)
GRANT EXECUTE ON FUNCTION trigger_email_queue_processing() TO authenticated;

-- 6. Update enrollment trigger to set proper next_send_at for first email
CREATE OR REPLACE FUNCTION enroll_user_in_onboarding()
RETURNS TRIGGER AS $$
DECLARE
  first_step_delay INTEGER;
BEGIN
  -- Check if onboarding sequence is active
  IF EXISTS (
    SELECT 1 FROM email_sequences
    WHERE id = '00000000-0000-0000-0000-000000000001'
    AND is_active = true
  ) THEN
    -- Get delay of first step (should be 0 for immediate)
    SELECT delay_hours INTO first_step_delay
    FROM email_sequence_steps
    WHERE sequence_id = '00000000-0000-0000-0000-000000000001'
    AND step_order = 1
    AND is_active = true;

    -- Default to 0 if not found
    first_step_delay := COALESCE(first_step_delay, 0);

    INSERT INTO email_sequence_enrollments (
      user_id,
      sequence_id,
      current_step,
      next_send_at
    )
    VALUES (
      NEW.user_id,
      '00000000-0000-0000-0000-000000000001',
      0,
      NOW() + (first_step_delay || ' hours')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enroll_user_in_onboarding() IS 'Automatically enrolls new users in the onboarding email sequence';
