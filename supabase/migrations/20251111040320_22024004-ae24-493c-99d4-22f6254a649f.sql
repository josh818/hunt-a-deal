-- Drop the comments table entirely
DROP TABLE IF EXISTS public.comments CASCADE;

-- Drop the profiles table (was only created for comments)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger and function for user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;