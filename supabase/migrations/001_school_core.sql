-- School Management core schema + RLS
-- Run in Supabase SQL Editor or via `supabase db push`

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
      'admin',
      'teacher',
      'student',
      'parent',
      'app_config',
      'accounting',
      'hr'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure role column exists (for existing tables)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade_level text,
  school_year text NOT NULL DEFAULT '2025-26',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_teachers (
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  subject_hint text,
  PRIMARY KEY (class_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS public.class_students (
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.parent_students (
  parent_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher ON public.class_teachers (teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students (student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students (class_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Auth: provision profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.app_role;
BEGIN
  BEGIN
    r := coalesce(
      (new.raw_user_meta_data->>'role')::public.app_role,
      'student'::public.app_role
    );
  EXCEPTION WHEN invalid_text_representation THEN
    r := 'student';
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    r
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Role helpers: SECURITY DEFINER avoids RLS recursion when querying profiles from policies.
DROP FUNCTION IF EXISTS public.my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_reader(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_reader() CASCADE;
CREATE OR REPLACE FUNCTION public.is_staff_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'app_config', 'accounting', 'hr') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

DROP FUNCTION IF EXISTS public.can_configure_school(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_configure_school() CASCADE;
CREATE OR REPLACE FUNCTION public.can_configure_school()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'app_config') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Staff read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_staff_reader());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin update any profile role" ON public.profiles;
CREATE POLICY "Admin update any profile role"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;
CREATE POLICY "Admin insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- classes: teachers ONLY their assigned classes (+ staff/student/parent rules)
DROP POLICY IF EXISTS "Classes visible by assignment or staff" ON public.classes;
CREATE POLICY "Classes visible by assignment or staff"
  ON public.classes FOR SELECT
  USING (
    public.is_staff_reader()
    OR EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = classes.id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.class_students cs
      WHERE cs.class_id = classes.id AND cs.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.class_students cs ON cs.student_id = ps.student_id
      WHERE ps.parent_id = auth.uid() AND cs.class_id = classes.id
    )
  );

DROP POLICY IF EXISTS "Admin can read classes" ON public.classes;
CREATE POLICY "Admin can read classes"
  ON public.classes FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert classes" ON public.classes;
CREATE POLICY "Admin can insert classes"
  ON public.classes FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update classes" ON public.classes;
CREATE POLICY "Admin can update classes"
  ON public.classes FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin and app_config delete classes" ON public.classes;
CREATE POLICY "Admin and app_config delete classes"
  ON public.classes FOR DELETE
  USING (public.can_configure_school());

-- class_teachers
DROP POLICY IF EXISTS "See class_teachers if staff or involved" ON public.class_teachers;
CREATE POLICY "See class_teachers if staff or involved"
  ON public.class_teachers FOR SELECT
  USING (
    public.is_staff_reader()
    OR teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_students cs
      WHERE cs.class_id = class_teachers.class_id AND cs.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.class_students cs ON cs.student_id = ps.student_id
      WHERE ps.parent_id = auth.uid() AND cs.class_id = class_teachers.class_id
    )
  );

DROP POLICY IF EXISTS "Admin app_config manage class_teachers" ON public.class_teachers;
CREATE POLICY "Admin app_config manage class_teachers"
  ON public.class_teachers FOR ALL
  USING (public.can_configure_school())
  WITH CHECK (public.can_configure_school());

-- class_students
DROP POLICY IF EXISTS "See class_students if allowed" ON public.class_students;
CREATE POLICY "See class_students if allowed"
  ON public.class_students FOR SELECT
  USING (
    public.is_staff_reader()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = class_students.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.class_teachers ct
      WHERE ct.class_id = class_students.class_id AND ct.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin app_config manage class_students" ON public.class_students;
CREATE POLICY "Admin app_config manage class_students"
  ON public.class_students FOR ALL
  USING (public.can_configure_school())
  WITH CHECK (public.can_configure_school());

-- parent_students
DROP POLICY IF EXISTS "Parent links readable by parties and staff" ON public.parent_students;
CREATE POLICY "Parent links readable by parties and staff"
  ON public.parent_students FOR SELECT
  USING (
    public.is_staff_reader()
    OR parent_id = auth.uid()
    OR student_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admin app_config manage parent_students" ON public.parent_students;
CREATE POLICY "Admin app_config manage parent_students"
  ON public.parent_students FOR ALL
  USING (public.can_configure_school())
  WITH CHECK (public.can_configure_school());

-- Admin role bootstrap in 001 only:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'you@school.edu';
-- After running 002_multiple_roles.sql, manage admin users via public.user_roles/public.roles.
