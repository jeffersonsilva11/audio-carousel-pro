-- Create usage_logs table for security auditing
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  action TEXT NOT NULL, -- upload_audio, transcribe, generate_script, generate_images, checkout, etc
  resource TEXT, -- carousel_id, etc
  status TEXT DEFAULT 'success', -- success, failed, rate_limited, invalid_file
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.usage_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs (service role)
CREATE POLICY "Service can insert logs"
ON public.usage_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_action ON public.usage_logs(action);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX idx_usage_logs_ip_address ON public.usage_logs(ip_address);

-- Add stripe_events table for webhook logging
CREATE TABLE public.stripe_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL, -- Stripe event ID
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view stripe events
CREATE POLICY "Admins can view stripe events"
ON public.stripe_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service can manage stripe events
CREATE POLICY "Service can manage stripe events"
ON public.stripe_events
FOR ALL
WITH CHECK (true);

-- Create index for stripe events
CREATE INDEX idx_stripe_events_event_id ON public.stripe_events(event_id);
CREATE INDEX idx_stripe_events_type ON public.stripe_events(event_type);
CREATE INDEX idx_stripe_events_processed ON public.stripe_events(processed);