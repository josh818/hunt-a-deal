-- Remove privacy-sensitive columns from click_tracking
ALTER TABLE public.click_tracking DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.click_tracking DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.click_tracking DROP COLUMN IF EXISTS referer;

-- Remove privacy-sensitive columns from share_tracking
ALTER TABLE public.share_tracking DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.share_tracking DROP COLUMN IF EXISTS referer;