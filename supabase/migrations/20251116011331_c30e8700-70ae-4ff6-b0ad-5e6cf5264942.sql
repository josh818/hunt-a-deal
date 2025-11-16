-- Add coupon_code column to deals table
ALTER TABLE public.deals 
ADD COLUMN coupon_code text;

-- Add index for faster lookups of deals with coupon codes
CREATE INDEX idx_deals_coupon_code ON public.deals(coupon_code) WHERE coupon_code IS NOT NULL;