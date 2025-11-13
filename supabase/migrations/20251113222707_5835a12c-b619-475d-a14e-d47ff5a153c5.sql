-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true);

-- Add logo_url column to projects table
ALTER TABLE projects ADD COLUMN logo_url TEXT;

-- Storage policies for project logos
CREATE POLICY "Anyone can view project logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-logos');

CREATE POLICY "Admins can upload project logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update project logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete project logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);