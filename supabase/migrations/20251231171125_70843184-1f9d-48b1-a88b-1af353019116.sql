-- Create table for share tracking analytics
CREATE TABLE public.share_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referer TEXT
);

-- Enable RLS
ALTER TABLE public.share_tracking ENABLE ROW LEVEL SECURITY;

-- Anyone can insert share events (public tracking)
CREATE POLICY "Anyone can track shares"
  ON public.share_tracking
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all share data
CREATE POLICY "Admins can view shares"
  ON public.share_tracking
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Project owners can view their own share data
CREATE POLICY "Project owners can view their shares"
  ON public.share_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = share_tracking.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_share_tracking_project_id ON public.share_tracking(project_id);
CREATE INDEX idx_share_tracking_platform ON public.share_tracking(platform);
CREATE INDEX idx_share_tracking_shared_at ON public.share_tracking(shared_at DESC);