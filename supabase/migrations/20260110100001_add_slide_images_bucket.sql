-- Migration: Add slide-images storage bucket for template system
-- Description: Creates storage bucket for user-uploaded slide images (Creator+ feature)

-- ============================================================================
-- STORAGE BUCKET: slide-images
-- ============================================================================

-- Create storage bucket for slide images (user uploads for templates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slide-images',
  'slide-images',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES: slide-images bucket
-- ============================================================================

-- Allow authenticated users to upload to their own folder
-- Path format: {user_id}/{carousel_id}/slide-{index}-{timestamp}.{ext}
CREATE POLICY "Users can upload slide images to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own images
CREATE POLICY "Users can view their own slide images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for slide images (needed for SVG rendering in edge functions)
CREATE POLICY "Public can view slide images"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'slide-images');

-- Allow authenticated users to update their own images (for upsert)
CREATE POLICY "Users can update their own slide images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own slide images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- CLEANUP FUNCTION: Remove orphaned slide images
-- ============================================================================

-- Function to clean up slide images when carousel is deleted
CREATE OR REPLACE FUNCTION cleanup_carousel_slide_images()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: Actual storage cleanup requires edge function or external trigger
  -- This function logs the deletion for potential async cleanup
  INSERT INTO storage.cleanup_queue (bucket_id, path_prefix, created_at)
  VALUES ('slide-images', OLD.user_id::text || '/' || OLD.id::text || '/', NOW())
  ON CONFLICT DO NOTHING;

  RETURN OLD;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip cleanup logging
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cleanup queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.cleanup_queue (
  id SERIAL PRIMARY KEY,
  bucket_id TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT unique_cleanup_path UNIQUE (bucket_id, path_prefix)
);

-- Create trigger for carousel deletion (optional - for future cleanup automation)
DROP TRIGGER IF EXISTS cleanup_carousel_images_trigger ON carousels;
CREATE TRIGGER cleanup_carousel_images_trigger
  BEFORE DELETE ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_carousel_slide_images();
