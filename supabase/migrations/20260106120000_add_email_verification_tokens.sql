-- Create email_verification_tokens table for custom email verification flow via SMTP
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);

-- Add comment to table
COMMENT ON TABLE public.email_verification_tokens IS 'Stores OTP tokens for custom email verification flow via SMTP';

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens (no user access)
-- This is intentional - tokens are managed by edge functions using service role

-- Create function to clean up expired/used tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_verification_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < now() OR verified_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated (for scheduled cleanup)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_email_verification_tokens() TO authenticated;
