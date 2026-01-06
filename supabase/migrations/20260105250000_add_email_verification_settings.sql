-- ============================================
-- Email Verification Settings & SMTP Configuration
-- ============================================
-- Adds settings to control email verification behavior and SMTP configuration

-- Insert new email verification settings
INSERT INTO app_settings (key, value, description) VALUES
  ('email_verification_enabled', 'true', 'Whether email verification is required for new users'),
  ('use_custom_email_sending', 'false', 'Use custom SMTP instead of Supabase for sending emails'),
  ('custom_email_from_name', 'Audisell', 'Name shown in the From field of emails'),
  ('custom_email_from_address', '', 'Email address used as sender (defaults to smtp_user if empty)')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

-- Insert SMTP configuration settings
INSERT INTO app_settings (key, value, description) VALUES
  ('smtp_host', '', 'SMTP server hostname (e.g., smtp.hostinger.com)'),
  ('smtp_port', '587', 'SMTP server port (usually 587 for TLS or 465 for SSL)'),
  ('smtp_user', '', 'SMTP authentication username (usually the email address)'),
  ('smtp_secure', 'true', 'Use TLS/SSL for SMTP connection')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;

-- Note: SMTP password should be stored as a Supabase secret (SMTP_PASSWORD)
-- not in app_settings for security reasons

-- Add comment
COMMENT ON TABLE app_settings IS 'Application-wide settings including registration, maintenance mode, email verification, SMTP, and version control';
