-- Fix remaining security issues

-- 1. Fix admin_activity_log: Remove the permissive "true" INSERT policy
-- The new restricted admin policy was added but old one still exists
DROP POLICY IF EXISTS "System can insert activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Authenticated admins can insert activity log" ON public.admin_activity_log;

-- Create proper INSERT policy for admin activity log
-- Only admins can insert activity logs (used by promote_to_admin function)
CREATE POLICY "Admins can insert activity log" 
ON public.admin_activity_log 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Note: The promote_to_admin function uses SECURITY DEFINER so it bypasses RLS
-- For service role operations (edge functions), they bypass RLS automatically