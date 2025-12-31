-- Fix projects table exposure: restrict to authenticated users only

-- Drop the public access policy that exposes sensitive data
DROP POLICY IF EXISTS "Anyone can view active projects" ON public.projects;

-- Drop the existing user view policy (it's restrictive, needs to be permissive)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

-- Create a permissive policy for authenticated users to view their own projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (auth.uid() = created_by);

-- Create a permissive policy for authenticated users to view active projects (but not anonymous)
-- This protects created_by and whatsapp_number from public/anonymous access
CREATE POLICY "Authenticated users can view active projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (is_active = true);