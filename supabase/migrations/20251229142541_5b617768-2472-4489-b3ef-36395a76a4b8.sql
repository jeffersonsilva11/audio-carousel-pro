-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  instagram_handle TEXT,
  profile_image TEXT,
  preferred_lang TEXT DEFAULT 'pt-BR',
  default_tone TEXT DEFAULT 'PROFESSIONAL',
  default_style TEXT DEFAULT 'BLACK_WHITE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create carousels table
CREATE TABLE public.carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT,
  audio_size INTEGER,
  audio_duration FLOAT,
  transcription TEXT,
  script JSONB,
  tone TEXT DEFAULT 'PROFESSIONAL',
  style TEXT DEFAULT 'BLACK_WHITE',
  format TEXT DEFAULT 'POST_SQUARE',
  language TEXT DEFAULT 'pt-BR',
  image_urls TEXT[],
  slide_count INTEGER DEFAULT 6,
  has_watermark BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'PROCESSING',
  error_message TEXT,
  processing_time FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on carousels
ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;

-- Carousels policies
CREATE POLICY "Users can view their own carousels"
ON public.carousels FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carousels"
ON public.carousels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own carousels"
ON public.carousels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carousels"
ON public.carousels FOR DELETE
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_carousels_updated_at
  BEFORE UPDATE ON public.carousels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_carousels_user_id ON public.carousels(user_id);
CREATE INDEX idx_carousels_created_at ON public.carousels(created_at DESC);