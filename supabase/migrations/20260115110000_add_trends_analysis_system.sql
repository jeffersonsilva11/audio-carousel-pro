-- Migration: Add AI-powered trends analysis system
-- Description: Stores AI analysis results of carousel content for business insights

-- Create trend_reports table to store analysis results
CREATE TABLE IF NOT EXISTS trend_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report metadata
  period_days INTEGER NOT NULL, -- 7, 30, or 90 days
  carousels_analyzed INTEGER NOT NULL DEFAULT 0,

  -- Analysis date range
  analysis_start DATE NOT NULL,
  analysis_end DATE NOT NULL,

  -- AI-generated insights (structured JSON)
  topics JSONB DEFAULT '[]'::jsonb,           -- [{name, count, percentage, trend}]
  niches JSONB DEFAULT '[]'::jsonb,           -- [{name, count, percentage, trend}]
  tones JSONB DEFAULT '[]'::jsonb,            -- [{name, count, percentage}]
  sentiments JSONB DEFAULT '[]'::jsonb,       -- [{name, count, percentage}]
  keywords JSONB DEFAULT '[]'::jsonb,         -- [{word, count, category}]
  content_formats JSONB DEFAULT '[]'::jsonb,  -- [{type, count, percentage}]

  -- Trend evolution (compared to previous period)
  trends_evolution JSONB DEFAULT '{}'::jsonb, -- {growing: [], declining: [], stable: [], new: []}

  -- Summary insights
  ai_summary TEXT,                            -- Natural language summary
  recommendations JSONB DEFAULT '[]'::jsonb,  -- AI recommendations for product

  -- Raw data for reference
  sample_transcriptions JSONB DEFAULT '[]'::jsonb, -- Sample of analyzed content

  -- Processing info
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  model_used TEXT DEFAULT 'gpt-4o-mini',

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,

  -- Who triggered the analysis
  triggered_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (using IF NOT EXISTS to allow re-running)
CREATE INDEX IF NOT EXISTS idx_trend_reports_period ON trend_reports(period_days, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_reports_status ON trend_reports(status);
CREATE INDEX IF NOT EXISTS idx_trend_reports_date_range ON trend_reports(analysis_start, analysis_end);

-- Enable RLS
ALTER TABLE trend_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can view/manage trend reports
DROP POLICY IF EXISTS "Admins can view trend reports" ON trend_reports;
CREATE POLICY "Admins can view trend reports"
ON trend_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can insert trend reports" ON trend_reports;
CREATE POLICY "Admins can insert trend reports"
ON trend_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Service role can manage trend reports" ON trend_reports;
CREATE POLICY "Service role can manage trend reports"
ON trend_reports FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get latest report for a period
CREATE OR REPLACE FUNCTION get_latest_trend_report(p_period_days INTEGER)
RETURNS trend_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report trend_reports;
BEGIN
  SELECT * INTO v_report
  FROM trend_reports
  WHERE period_days = p_period_days
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_report;
END;
$$;

-- Function to check if analysis is needed (rate limiting)
CREATE OR REPLACE FUNCTION can_run_trend_analysis(p_period_days INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_analysis TIMESTAMPTZ;
  v_min_interval INTERVAL;
BEGIN
  -- Set minimum interval based on period
  v_min_interval := CASE p_period_days
    WHEN 7 THEN INTERVAL '1 hour'
    WHEN 30 THEN INTERVAL '4 hours'
    WHEN 90 THEN INTERVAL '12 hours'
    ELSE INTERVAL '1 hour'
  END;

  -- Get last completed analysis for this period
  SELECT created_at INTO v_last_analysis
  FROM trend_reports
  WHERE period_days = p_period_days
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no previous analysis, allow
  IF v_last_analysis IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if enough time has passed
  RETURN (NOW() - v_last_analysis) > v_min_interval;
END;
$$;

-- Add comments
COMMENT ON TABLE trend_reports IS 'Stores AI-generated analysis of carousel content trends';
COMMENT ON COLUMN trend_reports.topics IS 'Main topics/themes found in carousel content';
COMMENT ON COLUMN trend_reports.niches IS 'Business niches/industries of users';
COMMENT ON COLUMN trend_reports.trends_evolution IS 'Comparison with previous period showing growing/declining trends';
