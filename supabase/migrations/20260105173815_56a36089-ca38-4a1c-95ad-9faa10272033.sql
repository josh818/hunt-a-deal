-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_public_project_by_slug(text);

-- Recreate function with updated columns including custom_slug and url_prefix
CREATE FUNCTION public.get_public_project_by_slug(project_slug text)
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  tracking_code text, 
  description text, 
  logo_url text, 
  whatsapp_number text, 
  is_active boolean, 
  created_at timestamp with time zone,
  custom_slug text,
  url_prefix text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.tracking_code,
    p.description,
    p.logo_url,
    p.whatsapp_number,
    p.is_active,
    p.created_at,
    p.custom_slug,
    p.url_prefix
  FROM public.projects p
  WHERE (p.slug = project_slug OR p.custom_slug = project_slug)
    AND p.is_active = true;
$$;