-- Create deals table for caching
CREATE TABLE public.deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  discount DECIMAL(5, 2),
  image_url TEXT NOT NULL,
  product_url TEXT NOT NULL,
  category TEXT,
  rating DECIMAL(3, 2),
  review_count INTEGER,
  brand TEXT,
  in_stock BOOLEAN DEFAULT true,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS (but make it publicly readable since these are public deals)
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read deals
CREATE POLICY "Anyone can view deals"
  ON public.deals
  FOR SELECT
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_deals_category ON public.deals(category);
CREATE INDEX idx_deals_price ON public.deals(price);
CREATE INDEX idx_deals_discount ON public.deals(discount);
CREATE INDEX idx_deals_fetched_at ON public.deals(fetched_at);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_deals_timestamp
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deals_updated_at();