-- Add scheduled_for column for time-based scheduling
ALTER TABLE public.scheduled_posts
ADD COLUMN scheduled_for timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of scheduled posts
CREATE INDEX idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for) WHERE scheduled_for IS NOT NULL;