-- Create bucket for slide images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('slide-images', 'slide-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for slide-images bucket
CREATE POLICY "Anyone can view slide images"
ON storage.objects FOR SELECT
USING (bucket_id = 'slide-images');

CREATE POLICY "Authenticated users can upload slide images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'slide-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own slide images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'slide-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own slide images"
ON storage.objects FOR DELETE
USING (bucket_id = 'slide-images' AND auth.uid()::text = (storage.foldername(name))[1]);