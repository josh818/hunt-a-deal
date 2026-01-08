-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can track clicks" ON public.click_tracking;
DROP POLICY IF EXISTS "Anyone can track shares" ON public.share_tracking;

-- Create a security definer function to validate deal exists
CREATE OR REPLACE FUNCTION public.deal_exists(_deal_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals
    WHERE id = _deal_id
  )
$$;

-- Create a security definer function to validate project exists
CREATE OR REPLACE FUNCTION public.project_exists(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND is_active = true
  )
$$;

-- Create validated click tracking policy
-- Allows inserts only when deal_id references an existing deal
-- and project_id (if provided) references an existing active project
CREATE POLICY "Anyone can track clicks with valid deal"
ON public.click_tracking
FOR INSERT
WITH CHECK (
  public.deal_exists(deal_id)
  AND (project_id IS NULL OR public.project_exists(project_id))
);

-- Create validated share tracking policy  
-- Allows inserts only when project_id (if provided) references an existing project
-- and platform is a valid value
CREATE POLICY "Anyone can track shares with valid data"
ON public.share_tracking
FOR INSERT
WITH CHECK (
  (project_id IS NULL OR public.project_exists(project_id))
  AND platform IN ('whatsapp', 'facebook', 'twitter', 'copy', 'email', 'other')
);