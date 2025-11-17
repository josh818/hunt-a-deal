-- Create price history table
CREATE TABLE IF NOT EXISTS public.deal_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  discount NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deal_price_history_deal_id ON public.deal_price_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_price_history_recorded_at ON public.deal_price_history(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.deal_price_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view price history (public data)
CREATE POLICY "Anyone can view price history"
  ON public.deal_price_history
  FOR SELECT
  USING (true);

-- Only system can insert price history
CREATE POLICY "System can insert price history"
  ON public.deal_price_history
  FOR INSERT
  WITH CHECK (true);