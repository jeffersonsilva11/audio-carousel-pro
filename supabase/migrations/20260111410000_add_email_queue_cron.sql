-- Migration: Add cron job for email queue processing
-- Processes onboarding email sequences every 5 minutes

-- Get the Supabase URL and service role key from existing job or use defaults
DO $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_existing_command TEXT;
BEGIN
  -- Try to extract URL from existing cleanup job
  SELECT command INTO v_existing_command
  FROM cron.job
  WHERE jobname = 'cleanup-old-carousel-images'
  LIMIT 1;

  IF v_existing_command IS NOT NULL THEN
    -- Extract URL (between "url := '" and "/functions")
    v_supabase_url := substring(v_existing_command from 'url := ''([^'']+)/functions');

    -- Extract service role key from Authorization header
    v_service_role_key := substring(v_existing_command from 'Bearer ([^"]+)"');
  END IF;

  -- Fallback to environment or hardcoded (will need manual update)
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://your-project.supabase.co';
    RAISE NOTICE 'Could not extract Supabase URL. Please update the cron job manually.';
  END IF;

  IF v_service_role_key IS NULL THEN
    v_service_role_key := 'your-service-role-key';
    RAISE NOTICE 'Could not extract service role key. Please update the cron job manually.';
  END IF;

  -- Remove existing job if any
  PERFORM cron.unschedule('process-email-queue');

  -- Schedule new job - every 5 minutes
  PERFORM cron.schedule(
    'process-email-queue',
    '*/5 * * * *',
    format(
      $cron$
        SELECT net.http_post(
          url := '%s/functions/v1/process-email-queue',
          headers := '{"Authorization": "Bearer %s", "Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb
        );
      $cron$,
      v_supabase_url,
      v_service_role_key
    )
  );

  RAISE NOTICE 'Email queue cron job scheduled successfully (every 5 minutes)';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. You may need to add it manually.', SQLERRM;
END;
$$;

-- Also schedule the scheduled-notifications function (for in-app notifications)
-- This runs daily at 9:30 AM UTC (after check-expiring-subscriptions)
DO $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_existing_command TEXT;
BEGIN
  -- Try to extract URL from existing cleanup job
  SELECT command INTO v_existing_command
  FROM cron.job
  WHERE jobname = 'cleanup-old-carousel-images'
  LIMIT 1;

  IF v_existing_command IS NOT NULL THEN
    v_supabase_url := substring(v_existing_command from 'url := ''([^'']+)/functions');
    v_service_role_key := substring(v_existing_command from 'Bearer ([^"]+)"');
  END IF;

  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Skipping scheduled-notifications cron - could not extract credentials';
    RETURN;
  END IF;

  -- Remove existing job if any
  PERFORM cron.unschedule('scheduled-notifications');

  -- Schedule new job - daily at 9:30 AM UTC
  PERFORM cron.schedule(
    'scheduled-notifications',
    '30 9 * * *',
    format(
      $cron$
        SELECT net.http_post(
          url := '%s/functions/v1/scheduled-notifications',
          headers := '{"Authorization": "Bearer %s", "Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb
        );
      $cron$,
      v_supabase_url,
      v_service_role_key
    )
  );

  RAISE NOTICE 'Scheduled notifications cron job added (daily at 9:30 AM UTC)';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule notifications job: %', SQLERRM;
END;
$$;

-- Show all scheduled jobs for verification
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Current Cron Jobs ===';
  FOR r IN SELECT jobname, schedule, active FROM cron.job ORDER BY jobid LOOP
    RAISE NOTICE 'Job: % | Schedule: % | Active: %', r.jobname, r.schedule, r.active;
  END LOOP;
END;
$$;
