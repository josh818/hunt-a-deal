-- Add address fields to projects table for payment processing
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Add earnings tracking columns
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_earnings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_earnings NUMERIC DEFAULT 0;