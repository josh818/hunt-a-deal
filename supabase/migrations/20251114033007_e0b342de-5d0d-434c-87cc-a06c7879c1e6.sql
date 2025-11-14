-- Create job health monitoring table
CREATE TABLE IF NOT EXISTS public.cron_job_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id BIGINT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  consecutive_failures INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  uptime_percentage NUMERIC(5,2) DEFAULT 100.00,
  alert_sent BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id)
);

-- Enable RLS
ALTER TABLE public.cron_job_health ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view job health
CREATE POLICY "Admins can view job health"
  ON public.cron_job_health
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create policy for system to manage job health
CREATE POLICY "System can manage job health"
  ON public.cron_job_health
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_cron_job_health_job_id ON public.cron_job_health(job_id);
CREATE INDEX idx_cron_job_health_status ON public.cron_job_health(status);

-- Function to update job health after each run
CREATE OR REPLACE FUNCTION public.update_cron_job_health()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_name TEXT;
  v_total_runs INTEGER;
  v_successful_runs INTEGER;
  v_failed_runs INTEGER;
  v_consecutive_failures INTEGER;
  v_status TEXT;
  v_uptime NUMERIC(5,2);
BEGIN
  -- Get job name from cron.job
  SELECT jobname INTO v_job_name
  FROM cron.job
  WHERE jobid = NEW.jobid;

  -- Calculate stats from recent runs (last 100 runs)
  SELECT 
    COUNT(*),
    SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END),
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)
  INTO v_total_runs, v_successful_runs, v_failed_runs
  FROM (
    SELECT status
    FROM cron.job_run_details
    WHERE jobid = NEW.jobid
    ORDER BY start_time DESC
    LIMIT 100
  ) recent_runs;

  -- Calculate consecutive failures
  SELECT COUNT(*)
  INTO v_consecutive_failures
  FROM (
    SELECT status
    FROM cron.job_run_details
    WHERE jobid = NEW.jobid
    AND status = 'failed'
    ORDER BY start_time DESC
  ) consecutive
  WHERE NOT EXISTS (
    SELECT 1
    FROM cron.job_run_details
    WHERE jobid = NEW.jobid
    AND status = 'succeeded'
    AND start_time > consecutive.start_time
    LIMIT 1
  );

  -- Calculate uptime percentage
  IF v_total_runs > 0 THEN
    v_uptime := (v_successful_runs::NUMERIC / v_total_runs::NUMERIC * 100);
  ELSE
    v_uptime := 100.00;
  END IF;

  -- Determine health status
  IF v_consecutive_failures >= 5 OR v_uptime < 80 THEN
    v_status := 'critical';
  ELSIF v_consecutive_failures >= 3 OR v_uptime < 90 THEN
    v_status := 'warning';
  ELSIF v_consecutive_failures = 0 AND v_uptime >= 95 THEN
    v_status := 'healthy';
  ELSE
    v_status := 'warning';
  END IF;

  -- Upsert health record
  INSERT INTO public.cron_job_health (
    job_id,
    job_name,
    status,
    consecutive_failures,
    last_success_at,
    last_failure_at,
    total_runs,
    successful_runs,
    failed_runs,
    uptime_percentage,
    alert_sent,
    updated_at
  )
  VALUES (
    NEW.jobid,
    v_job_name,
    v_status,
    v_consecutive_failures,
    CASE WHEN NEW.status = 'succeeded' THEN NEW.end_time ELSE NULL END,
    CASE WHEN NEW.status = 'failed' THEN NEW.end_time ELSE NULL END,
    v_total_runs,
    v_successful_runs,
    v_failed_runs,
    v_uptime,
    CASE WHEN v_consecutive_failures >= 3 THEN FALSE ELSE TRUE END,
    NOW()
  )
  ON CONFLICT (job_id)
  DO UPDATE SET
    job_name = EXCLUDED.job_name,
    status = EXCLUDED.status,
    consecutive_failures = EXCLUDED.consecutive_failures,
    last_success_at = COALESCE(EXCLUDED.last_success_at, cron_job_health.last_success_at),
    last_failure_at = COALESCE(EXCLUDED.last_failure_at, cron_job_health.last_failure_at),
    total_runs = EXCLUDED.total_runs,
    successful_runs = EXCLUDED.successful_runs,
    failed_runs = EXCLUDED.failed_runs,
    uptime_percentage = EXCLUDED.uptime_percentage,
    alert_sent = CASE WHEN EXCLUDED.consecutive_failures >= 3 THEN FALSE ELSE cron_job_health.alert_sent END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger to update health on job run completion
CREATE TRIGGER trigger_update_cron_job_health
  AFTER INSERT ON cron.job_run_details
  FOR EACH ROW
  WHEN (NEW.end_time IS NOT NULL)
  EXECUTE FUNCTION public.update_cron_job_health();

-- Enable realtime for job health table
ALTER PUBLICATION supabase_realtime ADD TABLE public.cron_job_health;