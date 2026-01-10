-- Migration: Fix slide-images bucket migration conflicts
-- Description: Corrects duplicate policy errors and creates missing cleanup_queue table
-- This migration resolves issues from 20260110100001 and 20260110100002

-- ============================================================================
-- STEP 1: Ensure slide-images bucket exists
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slide-images',
  'slide-images',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Drop all existing slide-images policies to recreate them consistently
-- ============================================================================

-- Drop any existing policies (from 20251230233235 migration or partial 20260110100001)
DROP POLICY IF EXISTS "Anyone can view slide images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload slide images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own slide images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own slide images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload slide images to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own slide images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view slide images" ON storage.objects;

-- ============================================================================
-- STEP 3: Recreate all slide-images policies with consistent naming
-- ============================================================================

-- Allow public read access for slide images (needed for carousel rendering)
CREATE POLICY "slide_images_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'slide-images');

-- Allow authenticated users to upload to their own folder
-- Path format: {user_id}/slides/{timestamp}-slide-{index}.{ext}
CREATE POLICY "slide_images_user_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images (for upsert)
CREATE POLICY "slide_images_user_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "slide_images_user_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'slide-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 4: Create cleanup_queue table (must exist before trigger function)
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage.cleanup_queue (
  id SERIAL PRIMARY KEY,
  bucket_id TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT unique_cleanup_path UNIQUE (bucket_id, path_prefix)
);

COMMENT ON TABLE storage.cleanup_queue IS
'Queue for storage file cleanup. Entries are added when carousels are deleted.
Path format: {user_id}/slides/{timestamp}-slide-{index}.{ext}
Process with edge function or cron job to actually delete files.';

-- ============================================================================
-- STEP 5: Drop and recreate cleanup trigger function
-- ============================================================================

DROP TRIGGER IF EXISTS cleanup_carousel_images_trigger ON carousels;
DROP FUNCTION IF EXISTS cleanup_carousel_slide_images();

-- Function to extract storage paths from public URLs and queue them for cleanup
CREATE OR REPLACE FUNCTION cleanup_carousel_slide_images()
RETURNS TRIGGER AS $$
DECLARE
  slide_url TEXT;
  storage_path TEXT;
  url_array TEXT[];
  bucket_base TEXT;
BEGIN
  -- Get the Supabase storage URL pattern to extract paths
  bucket_base := '/storage/v1/object/public/slide-images/';

  -- Extract slide image URLs from template_config.slideImages if present
  IF OLD.template_config IS NOT NULL AND OLD.template_config ? 'slideImages' THEN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(OLD.template_config->'slideImages')
      WHERE jsonb_array_elements_text(OLD.template_config->'slideImages') IS NOT NULL
    ) INTO url_array;

    IF url_array IS NOT NULL THEN
      FOREACH slide_url IN ARRAY url_array
      LOOP
        IF slide_url IS NOT NULL AND slide_url LIKE '%' || bucket_base || '%' THEN
          storage_path := substring(slide_url from bucket_base || '(.+)$');

          IF storage_path IS NOT NULL AND storage_path != '' THEN
            INSERT INTO storage.cleanup_queue (bucket_id, path_prefix, created_at)
            VALUES ('slide-images', storage_path, NOW())
            ON CONFLICT (bucket_id, path_prefix) DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Also queue paths from carousel_slide_images table (if records exist)
  INSERT INTO storage.cleanup_queue (bucket_id, path_prefix, created_at)
  SELECT 'slide-images', storage_path, NOW()
  FROM carousel_slide_images
  WHERE carousel_id = OLD.id
  ON CONFLICT (bucket_id, path_prefix) DO NOTHING;

  RETURN OLD;
EXCEPTION
  WHEN undefined_table THEN
    RETURN OLD;
  WHEN OTHERS THEN
    RAISE WARNING 'cleanup_carousel_slide_images error: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER cleanup_carousel_images_trigger
  BEFORE DELETE ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_carousel_slide_images();

-- ============================================================================
-- STEP 6: Mark conflicting migrations as resolved (conceptually)
-- ============================================================================

-- This migration consolidates and fixes:
-- - 20251230233235_*.sql (original slide-images policies)
-- - 20260110100001_add_slide_images_bucket.sql (duplicate policies error)
-- - 20260110100002_fix_slide_images_cleanup.sql (missing cleanup_queue error)
--
-- After running this migration, the original files can remain as-is but
-- will effectively be superseded by this corrective migration.
