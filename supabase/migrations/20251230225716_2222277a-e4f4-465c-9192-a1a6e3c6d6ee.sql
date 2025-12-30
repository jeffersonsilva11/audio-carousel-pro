-- Feature Flags table for admin-controlled feature toggles
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Only admins can modify feature flags
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default feature flags
INSERT INTO public.feature_flags (key, name, description, enabled) VALUES
  ('audio_upload', 'Audio Upload', 'Allow users to upload audio files', true),
  ('audio_recording', 'Audio Recording', 'Allow users to record audio in browser', true),
  ('image_generation', 'Image Generation', 'Generate carousel images', true),
  ('batch_download', 'Batch Download', 'Allow downloading multiple carousels as ZIP', true),
  ('creative_mode', 'Creative Mode', 'Enable creative text mode with tone options', true),
  ('new_user_signup', 'New User Signup', 'Allow new user registrations', true);

-- API Usage tracking table for cost estimation
CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL, -- 'whisper' or 'gemini'
  action TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  audio_seconds NUMERIC DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own API usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all API usage"
  ON public.api_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Service can insert usage logs
CREATE POLICY "Service can insert API usage"
  ON public.api_usage FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_api_name ON public.api_usage(api_name);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);