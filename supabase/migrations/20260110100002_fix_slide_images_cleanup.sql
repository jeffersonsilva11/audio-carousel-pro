-- Migration: Fix slide-images cleanup trigger
-- Description: Updates the cleanup function to work with new storage path pattern
-- Previous path: {user_id}/{carousel_id}/...
-- New path: {user_id}/slides/{timestamp}-slide-{index}.{ext}

-- ============================================================================
-- DROP OLD BROKEN TRIGGER AND FUNCTION
-- ============================================================================

DROP TRIGGER IF EXISTS cleanup_carousel_images_trigger ON carousels;
DROP FUNCTION IF EXISTS cleanup_carousel_slide_images();

-- ============================================================================
-- NEW CLEANUP FUNCTION
-- ============================================================================

-- Function to extract storage paths from public URLs and queue them for cleanup
-- Handles both:
-- 1. URLs stored in template_config.slideImages (array of public URLs)
-- 2. Records in carousel_slide_images table (if used)
CREATE OR REPLACE FUNCTION cleanup_carousel_slide_images()
RETURNS TRIGGER AS $$
DECLARE
  slide_url TEXT;
  storage_path TEXT;
  url_array TEXT[];
  bucket_base TEXT;
BEGIN
  -- Get the Supabase storage URL pattern to extract paths
  -- Pattern: https://{project}.supabase.co/storage/v1/object/public/slide-images/{path}
  bucket_base := '/storage/v1/object/public/slide-images/';

  -- Extract slide image URLs from template_config.slideImages if present
  IF OLD.template_config IS NOT NULL AND OLD.template_config ? 'slideImages' THEN
    -- Get the slideImages array
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(OLD.template_config->'slideImages')
      WHERE jsonb_array_elements_text(OLD.template_config->'slideImages') IS NOT NULL
    ) INTO url_array;

    -- Process each URL to extract storage path
    IF url_array IS NOT NULL THEN
      FOREACH slide_url IN ARRAY url_array
      LOOP
        IF slide_url IS NOT NULL AND slide_url LIKE '%' || bucket_base || '%' THEN
          -- Extract path after the bucket base
          storage_path := substring(slide_url from bucket_base || '(.+)$');

          IF storage_path IS NOT NULL AND storage_path != '' THEN
            -- Queue this path for cleanup
            INSERT INTO storage.cleanup_queue (bucket_id, path_prefix, created_at)
            VALUES ('slide-images', storage_path, NOW())
            ON CONFLICT (bucket_id, path_prefix) DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Also queue paths from carousel_slide_images table (if records exist)
  -- These are deleted by CASCADE, but we need to clean up the actual files
  INSERT INTO storage.cleanup_queue (bucket_id, path_prefix, created_at)
  SELECT 'slide-images', storage_path, NOW()
  FROM carousel_slide_images
  WHERE carousel_id = OLD.id
  ON CONFLICT (bucket_id, path_prefix) DO NOTHING;

  RETURN OLD;
EXCEPTION
  WHEN undefined_table THEN
    -- cleanup_queue table doesn't exist, skip
    RETURN OLD;
  WHEN OTHERS THEN
    -- Log error but don't block deletion
    RAISE WARNING 'cleanup_carousel_slide_images error: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER cleanup_carousel_images_trigger
  BEFORE DELETE ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_carousel_slide_images();

-- ============================================================================
-- EDGE FUNCTION FOR PROCESSING CLEANUP QUEUE
-- ============================================================================
-- Note: The cleanup_queue table is populated, but actual file deletion
-- must be done by an edge function or cron job that:
-- 1. Reads unprocessed entries from storage.cleanup_queue
-- 2. Calls supabase.storage.from('slide-images').remove([path])
-- 3. Marks entries as processed (sets processed_at)
--
-- This can be done via pg_cron or an external scheduled job.

-- Update comment in cleanup_queue table
COMMENT ON TABLE storage.cleanup_queue IS
'Queue for storage file cleanup. Entries are added when carousels are deleted.
Path format: {user_id}/slides/{timestamp}-slide-{index}.{ext}
Process with edge function or cron job to actually delete files.';

-- ============================================================================
-- UPDATE ORIGINAL MIGRATION COMMENT
-- ============================================================================

COMMENT ON POLICY "Users can upload slide images to their folder" ON storage.objects IS
'Path format: {user_id}/slides/{timestamp}-slide-{index}.{ext}';
