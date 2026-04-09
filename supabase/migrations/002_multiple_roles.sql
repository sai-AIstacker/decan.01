-- Update to support multiple roles per user
-- Run after 001_school_core.sql

-- Drop old policies
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update any profile role" ON public.profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;

-- Drop functions that depend on app_role type
DROP FUNCTION IF EXISTS public.my_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role CASCADE;

-- Update profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop the app_role enum type (using CASCADE in case of dependencies)
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Update profiles table
ALTER TABLE public.profiles ADD COLUMN phone text;
ALTER TABLE public.profiles ADD COLUMN avatar_url text;

-- Create roles table
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_roles junction table
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Insert default roles
INSERT INTO public.roles (name) VALUES
  ('admin'),
  ('teacher'),
  ('student'),
  ('parent'),
  ('app_config'),
  ('accounting'),
  ('hr');

-- Drop existing helper functions (if any) to prevent "not unique" errors
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_configure_school(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_configure_school() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_reader(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_reader() CASCADE;

-- Update handle_new_user function
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, phone, avatar_url)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Assign default role (student)
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'student';
  INSERT INTO public.user_roles (user_id, role_id) VALUES (new.id, default_role_id);

  RETURN new;
END;
$$;

-- Helper functions
CREATE FUNCTION public.get_user_roles(user_uuid uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(r.name) FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid;
$$;

CREATE FUNCTION public.has_role(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND r.name = role_name
  );
$$;

CREATE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin');
$$;

CREATE FUNCTION public.can_configure_school(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin') OR public.has_role(user_uuid, 'app_config');
$$;

CREATE FUNCTION public.is_staff_reader(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin') OR
         public.has_role(user_uuid, 'app_config') OR
         public.has_role(user_uuid, 'accounting') OR
         public.has_role(user_uuid, 'hr');
$$;

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Roles policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can read roles"
  ON public.roles FOR SELECT
  USING (auth.role() = 'authenticated');

-- User roles policies
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can read all user roles"
  ON public.user_roles FOR SELECT
  USING (public.is_staff_reader());

CREATE POLICY "Admin can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Update profiles policies
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Staff read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff_reader());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- Migrate existing data (assign roles based on old role)
-- Note: Uncomment after migrating data manually if needed
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT p.id, r.id FROM public.profiles p
-- JOIN public.roles r ON r.name = p.role::text
-- ON CONFLICT DO NOTHING;