
-- Create default admin user using Supabase's built-in functions
-- This approach avoids direct manipulation of auth.users table

-- First, let's create a function to safely create the admin user
CREATE OR REPLACE FUNCTION create_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'siddinikhilesh@gmail.com';
  
  -- If user doesn't exist, we'll need to create it through the application
  -- For now, let's just ensure the profile will be created with admin role
  -- when the user signs up
  
  -- This function will be called after the admin user signs up manually
  -- to ensure they get admin privileges
  IF admin_user_id IS NOT NULL THEN
    -- Update existing profile to admin role
    UPDATE public.profiles 
    SET role = 'admin', 
        full_name = COALESCE(full_name, 'Admin User'),
        username = COALESCE(username, 'admin')
    WHERE id = admin_user_id;
    
    -- Insert profile if it doesn't exist
    INSERT INTO public.profiles (id, full_name, username, role)
    VALUES (admin_user_id, 'Admin User', 'admin', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
END;
$$;

-- Execute the function
SELECT create_default_admin();
