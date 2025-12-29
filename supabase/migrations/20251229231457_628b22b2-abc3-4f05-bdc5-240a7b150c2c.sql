-- Create storage bucket for carousel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload carousel images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'carousel-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own images
CREATE POLICY "Users can view their own carousel images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'carousel-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for carousel images (for sharing)
CREATE POLICY "Public can view carousel images"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'carousel-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own carousel images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'carousel-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);