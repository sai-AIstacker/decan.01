-- Drop old schema safely
DROP POLICY IF EXISTS "Classes visible by assignment or staff" ON public.classes;
DROP POLICY IF EXISTS "Admin and app_config manage classes" ON public.classes;
DROP POLICY IF EXISTS "Admin and app_config update classes" ON public.classes;
DROP POLICY IF EXISTS "Admin and app_config delete classes" ON public.classes;
DROP POLICY IF EXISTS "See class_teachers if staff or involved" ON public.class_teachers;
DROP POLICY IF EXISTS "Admin app_config manage class_teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "See class_students if allowed" ON public.class_students;
DROP POLICY IF EXISTS "Admin app_config manage class_students" ON public.class_students;
DROP POLICY IF EXISTS "Parent links readable by parties and staff" ON public.parent_students;
DROP POLICY IF EXISTS "Admin app_config manage parent_students" ON public.parent_students;

DROP TABLE IF EXISTS public.class_students;
DROP TABLE IF EXISTS public.class_teachers;
-- We preserve parent_students, profile, roles, user_roles
DROP TABLE IF EXISTS public.classes CASCADE; 


-- 1. Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one active year
CREATE UNIQUE INDEX IF NOT EXISTS one_active_academic_year ON public.academic_years (is_active) WHERE is_active = true;

-- 2. Terms / Semesters Table
CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  section text NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  class_teacher_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, section, academic_year_id)
);

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Class Subjects Mapping
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

-- 6. Student Enrollment Table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, academic_year_id)
);


-- ROW LEVEL SECURITY (RLS) --

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Helper to check if user has admin/config roles
-- Assuming `public.can_configure_school()` from 001_school_core.sql is available and accurate.
-- We'll recreate if missing, but it is in 002. It returns boolean.

-- 1. Academic Years RLS
DROP POLICY IF EXISTS "Anyone can read academic years" ON public.academic_years;
CREATE POLICY "Anyone can read academic years" ON public.academic_years FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage academic_years" ON public.academic_years;
CREATE POLICY "Admin manage academic_years" ON public.academic_years FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- 2. Terms RLS
DROP POLICY IF EXISTS "Anyone can read terms" ON public.terms;
CREATE POLICY "Anyone can read terms" ON public.terms FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage terms" ON public.terms;
CREATE POLICY "Admin manage terms" ON public.terms FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- 3. Subjects RLS
DROP POLICY IF EXISTS "Anyone can read subjects" ON public.subjects;
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage subjects" ON public.subjects;
CREATE POLICY "Admin manage subjects" ON public.subjects FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- 4. Classes (Complex READ logic)
-- Admin -> ALL
-- Teachers -> READ if class_teacher or assigned via class_subjects
-- Students -> READ if enrolled in class
-- Parents -> READ if child enrolled in class
DROP POLICY IF EXISTS "Admin can insert classes" ON public.classes;
CREATE POLICY "Admin can insert classes"
  ON public.classes FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can read classes" ON public.classes;
CREATE POLICY "Admin can read classes"
  ON public.classes FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update classes" ON public.classes;
CREATE POLICY "Admin can update classes"
  ON public.classes FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users view relevant classes" ON public.classes;
CREATE POLICY "Users view relevant classes" ON public.classes FOR SELECT
USING (
  public.can_configure_school()
  OR class_teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = classes.id AND cs.teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.class_id = classes.id AND e.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND e.class_id = classes.id
  )
);

-- 5. Class Subjects Mapping RLS
DROP POLICY IF EXISTS "Admin manage class_subjects" ON public.class_subjects;
CREATE POLICY "Admin manage class_subjects" ON public.class_subjects FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

DROP POLICY IF EXISTS "Users view relevant class_subjects" ON public.class_subjects;
CREATE POLICY "Users view relevant class_subjects" ON public.class_subjects FOR SELECT
USING (
  public.can_configure_school()
  OR teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_subjects.class_id AND c.class_teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.class_id = class_subjects.class_id AND e.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND e.class_id = class_subjects.class_id
  )
);

-- 6. Enrollments RLS
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
CREATE POLICY "Admin manage enrollments" ON public.enrollments FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

DROP POLICY IF EXISTS "Users view relevant enrollments" ON public.enrollments;
CREATE POLICY "Users view relevant enrollments" ON public.enrollments FOR SELECT
USING (
  public.can_configure_school()
  OR student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = enrollments.student_id
  )
  OR EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = enrollments.class_id AND c.class_teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = enrollments.class_id AND cs.teacher_id = auth.uid()
  )
);
