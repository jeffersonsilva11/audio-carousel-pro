-- Create app_settings table for admin-configurable settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (settings are public)
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
  ON public.app_settings
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default demo video URL setting
INSERT INTO public.app_settings (key, value, description)
VALUES ('demo_video_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'URL do vídeo de demonstração (embed do YouTube)')
ON CONFLICT (key) DO NOTHING;