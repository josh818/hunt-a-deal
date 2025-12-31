-- Add missing columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS community_size TEXT,
ADD COLUMN IF NOT EXISTS community_type TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_tracking_code ON public.projects(tracking_code);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_projects_updated_at() 
RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS update_projects_timestamp ON public.projects;
CREATE TRIGGER update_projects_timestamp 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_projects_updated_at();