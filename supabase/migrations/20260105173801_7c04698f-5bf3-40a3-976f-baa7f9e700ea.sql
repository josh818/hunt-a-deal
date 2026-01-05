-- Add custom_slug and url_prefix columns for flexible URL control
ALTER TABLE public.projects 
ADD COLUMN custom_slug text,
ADD COLUMN url_prefix text DEFAULT 'project';