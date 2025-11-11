-- Add slug column to projects table for custom URL paths
ALTER TABLE public.projects 
ADD COLUMN slug text UNIQUE;

-- Add a check constraint to ensure slug is URL-friendly
ALTER TABLE public.projects 
ADD CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$');

-- Create index for faster slug lookups
CREATE INDEX idx_projects_slug ON public.projects(slug);