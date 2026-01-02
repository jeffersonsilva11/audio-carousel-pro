-- Add cron job for automatic image cleanup
-- Note: pg_cron extension must be enabled in Supabase Dashboard > Database > Extensions

-- This creates a daily job at 3 AM UTC to clean up images older than 30 days
-- The job calls the cleanup-old-images edge function

-- Check if pg_cron extension exists before creating job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule cleanup job to run daily at 3 AM UTC
    PERFORM cron.schedule(
      'cleanup-old-carousel-images',
      '0 3 * * *',  -- Every day at 3:00 AM UTC
      $$
        SELECT net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-old-images',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $$
    );
    RAISE NOTICE 'Cleanup cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - manual cleanup required';
  END IF;
END $$;

-- Add index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_carousels_created_at_with_images
ON public.carousels (created_at)
WHERE image_urls IS NOT NULL;

-- Add column to track when images were cleaned up (optional, for auditing)
ALTER TABLE public.carousels
ADD COLUMN IF NOT EXISTS images_cleaned_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.carousels.images_cleaned_at IS 'Timestamp when images were automatically cleaned up after 30 days';
