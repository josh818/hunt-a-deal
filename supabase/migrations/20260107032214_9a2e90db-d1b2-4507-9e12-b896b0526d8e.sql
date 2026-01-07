-- Add image verification columns to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS image_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS image_retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_last_checked timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_image_url text;

-- Create index for finding deals needing image verification
CREATE INDEX IF NOT EXISTS idx_deals_image_ready ON public.deals (image_ready) WHERE image_ready = false;

-- Update existing deals: mark as ready if they have a valid image URL
UPDATE public.deals 
SET image_ready = true 
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url NOT LIKE '%placeholder%'
  AND image_url NOT LIKE '%No+Image%'
  AND image_url NOT LIKE '%No%20Image%';