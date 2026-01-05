-- ============================================
-- Email Verification Settings
-- ============================================
-- Adds settings to control email verification behavior

-- Insert new email verification settings
INSERT INTO app_settings (key, value, description) VALUES
  ('email_verification_enabled', 'true', 'Whether email verification is required for new users'),
  ('use_custom_email_sending', 'false', 'Use custom email sending (Resend) instead of Supabase'),
  ('custom_email_from_name', 'Audisell', 'Name shown in the From field of verification emails'),
  ('custom_email_from_address', 'noreply@audisell.com', 'Email address used for sending verification emails')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

-- Add comment
COMMENT ON TABLE app_settings IS 'Application-wide settings including registration, maintenance mode, email verification, and version control';
