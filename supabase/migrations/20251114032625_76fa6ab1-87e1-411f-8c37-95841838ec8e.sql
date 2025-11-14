-- Add functions to manage cron jobs

-- Function to update cron job active status
CREATE OR REPLACE FUNCTION public.toggle_cron_job(job_id bigint, new_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the job's active status in cron.job
  UPDATE cron.job 
  SET active = new_active 
  WHERE jobid = job_id;
  
  RETURN FOUND;
END;
$$;

-- Function to update cron job schedule
CREATE OR REPLACE FUNCTION public.update_cron_schedule(job_id bigint, new_schedule text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate cron schedule format (basic validation)
  IF new_schedule !~ '^(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})$' THEN
    RAISE EXCEPTION 'Invalid cron schedule format';
  END IF;
  
  -- Update the job's schedule in cron.job
  UPDATE cron.job 
  SET schedule = new_schedule 
  WHERE jobid = job_id;
  
  RETURN FOUND;
END;
$$;