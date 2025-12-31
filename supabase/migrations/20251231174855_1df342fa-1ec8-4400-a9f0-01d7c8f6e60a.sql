-- Fix remaining security warnings

-- 1. Fix cron_job_health: Replace permissive ALL policy with restrictive admin-only policies
DROP POLICY IF EXISTS "System can manage job health" ON public.cron_job_health;

-- Only admins can SELECT (already exists, but ensure it's permissive)
DROP POLICY IF EXISTS "Admins can view job health" ON public.cron_job_health;
CREATE POLICY "Admins can view job health" 
ON public.cron_job_health 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System operations (INSERT/UPDATE) bypass RLS via service role, no policy needed for regular users

-- 2. Fix deal_price_history: Remove open INSERT policy
-- Price history should only be inserted by system/service role
DROP POLICY IF EXISTS "System can insert price history" ON public.deal_price_history;

-- 3. admin_activity_log is fine - no UPDATE/DELETE is intentional to protect audit integrity
-- The lack of UPDATE/DELETE policies means those operations are blocked, which is correct