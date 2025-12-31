-- Fix remaining security issues (handling existing policies)

-- 3. Fix cron_job_health: Drop existing admin policy first, then recreate
DROP POLICY IF EXISTS "Admins can view job health" ON public.cron_job_health;

CREATE POLICY "Admins can view job health" 
ON public.cron_job_health 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 4. Fix click_tracking: Drop if exists and recreate
DROP POLICY IF EXISTS "Project owners can view their project clicks" ON public.click_tracking;

CREATE POLICY "Project owners can view their project clicks" 
ON public.click_tracking 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = click_tracking.project_id 
    AND projects.created_by = auth.uid()
  )
);