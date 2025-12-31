-- Fix projects table: Remove overly permissive SELECT policy that exposes WhatsApp numbers
-- Public access is handled by secure RPC functions that exclude sensitive fields

DROP POLICY IF EXISTS "Authenticated users can view active projects basic info" ON public.projects;

-- Keep existing policies:
-- "Admins can manage projects" - admins need full access
-- "Users can view their own projects" - owners can see their own data
-- "Users can create their own projects" - for new applications
-- "Users can update their own projects" - for profile updates