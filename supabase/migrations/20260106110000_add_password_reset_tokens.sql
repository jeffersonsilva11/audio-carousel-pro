-- Create password_reset_tokens table for custom password reset flow
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_tokens_email ON public.password_reset_tokens(email);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);

-- Add comment to table
COMMENT ON TABLE public.password_reset_tokens IS 'Stores OTP tokens for custom password reset flow via SMTP';

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens (no user access)
-- This is intentional - tokens are managed by edge functions using service role

-- Create function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated (for scheduled cleanup)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_reset_tokens() TO authenticated;
