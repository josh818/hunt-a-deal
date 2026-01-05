-- Add unique constraint on custom_slug to prevent conflicts at DB level
-- First, ensure no duplicates exist (null values are allowed to be duplicated)
CREATE UNIQUE INDEX IF NOT EXISTS projects_custom_slug_unique 
ON public.projects (custom_slug) 
WHERE custom_slug IS NOT NULL AND custom_slug != '';

-- Also ensure slug is unique (it should already be, but let's be safe)
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique 
ON public.projects (slug);