-- Fix toggle_cron_job function to require admin role
CREATE OR REPLACE FUNCTION public.toggle_cron_job(job_id bigint, new_active boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage cron jobs';
  END IF;
  
  -- Update the job's active status in cron.job
  UPDATE cron.job 
  SET active = new_active 
  WHERE jobid = job_id;
  
  RETURN FOUND;
END;
$function$;

-- Fix update_cron_schedule function to require admin role
CREATE OR REPLACE FUNCTION public.update_cron_schedule(job_id bigint, new_schedule text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage cron jobs';
  END IF;
  
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
$function$;