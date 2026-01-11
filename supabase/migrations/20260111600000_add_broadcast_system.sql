-- Migration: Add broadcast system for mass notifications and emails
-- Description: Creates infrastructure for sending notifications and emails to user segments

-- 1. Create broadcast_jobs table to track broadcast operations
CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('notification', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Target audience
  target_plans TEXT[] DEFAULT '{}', -- empty = all, ['free'], ['starter'], ['creator'], etc.
  target_all_users BOOLEAN DEFAULT false,

  -- Content for notifications
  notification_title_pt TEXT,
  notification_title_en TEXT,
  notification_title_es TEXT,
  notification_message_pt TEXT,
  notification_message_en TEXT,
  notification_message_es TEXT,
  notification_type TEXT DEFAULT 'announcement', -- announcement, update, promo, etc.
  notification_action_url TEXT,

  -- Content for emails
  email_subject_pt TEXT,
  email_subject_en TEXT,
  email_subject_es TEXT,
  email_template_key TEXT,
  email_template_data JSONB DEFAULT '{}',

  -- Processing info
  total_recipients INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Rate limiting
  batch_size INTEGER DEFAULT 50, -- items per batch
  batch_delay_ms INTEGER DEFAULT 1000, -- delay between batches (1 second)

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- 2. Create broadcast_recipients table to track individual deliveries
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES broadcast_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON broadcast_jobs(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_created_at ON broadcast_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_job_id ON broadcast_recipients(job_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);

-- 4. Enable RLS
ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Only admins can access (drop first if exists for idempotency)
DROP POLICY IF EXISTS "Admins can view broadcast jobs" ON broadcast_jobs;
DROP POLICY IF EXISTS "Admins can insert broadcast jobs" ON broadcast_jobs;
DROP POLICY IF EXISTS "Admins can update broadcast jobs" ON broadcast_jobs;
DROP POLICY IF EXISTS "Admins can view broadcast recipients" ON broadcast_recipients;
DROP POLICY IF EXISTS "Service role can manage broadcast recipients" ON broadcast_recipients;

CREATE POLICY "Admins can view broadcast jobs" ON broadcast_jobs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert broadcast jobs" ON broadcast_jobs
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update broadcast jobs" ON broadcast_jobs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can view broadcast recipients" ON broadcast_recipients
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Service role can manage broadcast recipients" ON broadcast_recipients
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Function to get user counts by plan
CREATE OR REPLACE FUNCTION get_users_count_by_plan()
RETURNS TABLE (
  plan_id TEXT,
  plan_name TEXT,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_effective_plans AS (
    -- Get each user's effective plan (manual subscription takes priority)
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      COALESCE(
        ms.plan_tier,  -- Manual subscription has priority
        s.plan_id,     -- Then Stripe subscription
        'free'         -- Default to free
      ) as plan_tier
    FROM profiles p
    LEFT JOIN manual_subscriptions ms ON ms.user_id = p.user_id
      AND ms.is_active = true
      AND (ms.expires_at IS NULL OR ms.expires_at > NOW())
    LEFT JOIN subscriptions s ON s.user_id = p.user_id AND s.status = 'active'
  ),
  all_plans AS (
    -- Get all configured plans from plans_config
    SELECT pc.tier, pc.name_pt, pc.display_order
    FROM plans_config pc
    WHERE pc.is_active = true
  )
  SELECT
    ap.tier::TEXT as plan_id,
    ap.name_pt::TEXT as plan_name,
    COUNT(uep.user_id)::BIGINT as user_count
  FROM all_plans ap
  LEFT JOIN user_effective_plans uep ON uep.plan_tier = ap.tier
  GROUP BY ap.tier, ap.name_pt, ap.display_order
  ORDER BY ap.display_order, ap.tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to create broadcast recipients for a job
CREATE OR REPLACE FUNCTION create_broadcast_recipients(p_job_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_target_plans TEXT[];
  v_target_all BOOLEAN;
  v_count INTEGER := 0;
BEGIN
  -- Get job settings
  SELECT target_plans, target_all_users
  INTO v_target_plans, v_target_all
  FROM broadcast_jobs
  WHERE id = p_job_id;

  -- Insert recipients based on target
  IF v_target_all OR array_length(v_target_plans, 1) IS NULL OR v_target_plans = '{}' THEN
    -- All users
    INSERT INTO broadcast_recipients (job_id, user_id, email)
    SELECT p_job_id, u.id, u.email
    FROM auth.users u
    WHERE u.email IS NOT NULL
    ON CONFLICT DO NOTHING;
  ELSE
    -- Users in specific plans (considering both Stripe and manual subscriptions)
    INSERT INTO broadcast_recipients (job_id, user_id, email)
    SELECT DISTINCT p_job_id, u.id, u.email
    FROM auth.users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    LEFT JOIN manual_subscriptions ms ON ms.user_id = u.id
      AND ms.is_active = true
      AND (ms.expires_at IS NULL OR ms.expires_at > NOW())
    WHERE u.email IS NOT NULL
    AND (
      -- Free users (no active subscription - neither Stripe nor manual)
      ('free' = ANY(v_target_plans) AND s.id IS NULL AND ms.id IS NULL)
      OR
      -- Users with specific Stripe plan
      (s.plan_id = ANY(v_target_plans))
      OR
      -- Users with specific manual subscription plan
      (ms.plan_tier = ANY(v_target_plans))
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Get count and update job
  SELECT COUNT(*) INTO v_count FROM broadcast_recipients WHERE job_id = p_job_id;

  UPDATE broadcast_jobs
  SET total_recipients = v_count
  WHERE id = p_job_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add announcement template to email_templates if not exists
INSERT INTO email_templates (template_key, name, description, subject, html_content, variables, is_active)
VALUES (
  'announcement',
  'Comunicado Geral',
  'Template para envio de comunicados e anúncios em massa',
  '{{subject}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">{{fromName}}</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">{{title}}</h2>
      <div style="color: #52525b; font-size: 16px; line-height: 26px;">
        {{content}}
      </div>
      {{#if ctaUrl}}
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ctaUrl}}"
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          {{ctaText}}
        </a>
      </div>
      {{/if}}
    </div>
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © {{year}} {{fromName}}. Todos os direitos reservados.
      </p>
      <p style="color: #a1a1aa; font-size: 11px; margin: 8px 0 0 0;">
        Você recebeu este e-mail porque está cadastrado em nossa plataforma.
      </p>
    </div>
  </div>
</body>
</html>',
  '["subject", "title", "content", "ctaUrl", "ctaText", "fromName", "year"]',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_users_count_by_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION create_broadcast_recipients(UUID) TO authenticated;
