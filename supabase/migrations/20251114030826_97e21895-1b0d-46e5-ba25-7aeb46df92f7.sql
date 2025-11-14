-- Update deals table to handle larger price values
-- Change price field from NUMERIC(5,2) to NUMERIC(10,2) to support prices up to 99,999,999.99
ALTER TABLE public.deals 
ALTER COLUMN price TYPE NUMERIC(10,2);