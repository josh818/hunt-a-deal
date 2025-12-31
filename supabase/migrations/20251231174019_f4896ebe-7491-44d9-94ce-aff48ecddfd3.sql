-- Update the secure function to include whatsapp_number for single project lookup
-- This is intentional: project owners provide their WhatsApp for customer contact
-- The security concern was about created_by exposure, not whatsapp_number

DROP FUNCTION IF EXISTS public.get_public_project_by_slug(TEXT);

CREATE OR REPLACE FUNCTION public.get_public_project_by_slug(project_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  tracking_code TEXT,
  description TEXT,
  logo_url TEXT,
  whatsapp_number TEXT,
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
    p.whatsapp_number,  -- Included: owners intentionally share this for customer contact
    p.is_active,
    p.created_at
  FROM public.projects p
  WHERE p.slug = project_slug
    AND p.is_active = true;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_project_by_slug(TEXT) TO authenticated, anon;