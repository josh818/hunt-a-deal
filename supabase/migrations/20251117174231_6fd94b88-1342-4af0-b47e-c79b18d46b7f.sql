-- Add posted_at column to deals table to store the original deal posting timestamp
ALTER TABLE public.deals 
ADD COLUMN posted_at TIMESTAMP WITH TIME ZONE;