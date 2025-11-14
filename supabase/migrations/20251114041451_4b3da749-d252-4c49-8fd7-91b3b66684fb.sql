-- Create admin activity log table
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view activity log"
  ON public.admin_activity_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity log"
  ON public.admin_activity_log
  FOR INSERT
  WITH CHECK (true);

-- Update promote_to_admin function to log activity
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Insert admin role for target user (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the activity
  INSERT INTO public.admin_activity_log (admin_user_id, action_type, target_user_id, details)
  VALUES (
    auth.uid(),
    'promote_to_admin',
    target_user_id,
    jsonb_build_object(
      'role', 'admin',
      'promoted_at', now()
    )
  );
END;
$$;