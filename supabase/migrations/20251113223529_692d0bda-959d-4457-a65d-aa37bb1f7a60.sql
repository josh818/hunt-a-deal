-- Create admin user account
-- Note: This uses the Supabase Admin API to create a user
-- In production, users should sign up through the UI

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert user into auth.users table using Supabase's internal functions
  -- This is a workaround - normally users sign up through the UI
  
  -- Check if user already exists
  SELECT id INTO new_user_id 
  FROM auth.users 
  WHERE email = 'joshuahay@gmail.com';
  
  IF new_user_id IS NULL THEN
    -- User doesn't exist, we need to create via sign up
    -- This will need to be done through the UI or API
    RAISE NOTICE 'User does not exist. Please sign up through the UI first.';
  ELSE
    -- User exists, just add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to existing user';
  END IF;
END $$;