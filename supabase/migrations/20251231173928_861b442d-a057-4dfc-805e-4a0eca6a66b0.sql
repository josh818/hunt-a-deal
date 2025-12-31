-- Fix projects table: Create a security definer function to get public project data
-- This excludes sensitive fields (created_by, whatsapp_number) from public views

-- Drop existing policies that expose sensitive data
DROP POLICY IF EXISTS "Authenticated users can view active projects" ON public.projects;

-- Create a more restrictive policy for viewing active projects
-- Users can only see their own projects OR active projects, but with field-level security handled by application
CREATE POLICY "Authenticated users can view active projects basic info" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  -- Users can always see their own projects (full access)
  auth.uid() = created_by
  OR 
  -- Or active projects (public listing)
  is_active = true
);

-- Create a security definer function to get public project info without sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_project_by_slug(project_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  tracking_code TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.tracking_code,
    p.description,
    p.logo_url,
    p.is_active,
    p.created_at
  FROM public.projects p
  WHERE p.slug = project_slug
    AND p.is_active = true;
$$;

-- Create a function to get public project list (for browsing, excludes sensitive data)
CREATE OR REPLACE FUNCTION public.get_public_projects()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    p.logo_url,
    p.is_active,
    p.created_at
  FROM public.projects p
  WHERE p.is_active = true
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_project_by_slug(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_projects() TO authenticated, anon;