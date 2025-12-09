-- Drop the restrictive policy and recreate it as permissive
DROP POLICY IF EXISTS "Anyone can view active projects" ON public.projects;

-- Create permissive policy for viewing active projects (allows public access)
CREATE POLICY "Anyone can view active projects"
ON public.projects
FOR SELECT
USING (is_active = true);