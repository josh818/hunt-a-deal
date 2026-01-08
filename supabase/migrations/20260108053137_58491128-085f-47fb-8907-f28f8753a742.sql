-- Create scheduled_posts table to queue AI-generated posts
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'whatsapp', 'facebook', 'general'
  generated_text TEXT NOT NULL,
  page_url TEXT NOT NULL,
  tracked_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'posted', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  posted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all posts
CREATE POLICY "Admins can manage scheduled posts"
ON public.scheduled_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient queries
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_deal_id ON public.scheduled_posts(deal_id);
CREATE INDEX idx_scheduled_posts_platform ON public.scheduled_posts(platform);