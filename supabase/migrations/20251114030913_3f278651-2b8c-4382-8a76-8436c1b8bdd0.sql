-- Update all price-related fields in deals table to handle larger values
ALTER TABLE public.deals 
ALTER COLUMN original_price TYPE NUMERIC(10,2),
ALTER COLUMN discount TYPE NUMERIC(10,2);