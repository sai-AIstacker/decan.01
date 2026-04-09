-- Migration 018: Advanced Teacher Features
-- Lesson plans, assignments, class notices, teacher notes

-- =========================================================
-- 1. LESSON PLANS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  objectives text,
  content text,
  resources text,
  homework text,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes integer DEFAULT 45,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own lesson plans" ON public.lesson_plans;
CREATE POLICY "Teachers manage own lesson plans" ON public.lesson_plans
  FOR ALL USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Students view published lesson plans" ON public.lesson_plans;
CREATE POLICY "Students view published lesson plans" ON public.lesson_plans
  FOR SELECT USING (status = 'published' AND auth.uid() IS NOT NULL);

-- =========================================================
-- 2. ASSIGNMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  instructions text,
  max_marks numeric(6,2) DEFAULT 100,
  due_date date NOT NULL,
  assigned_date date DEFAULT CURRENT_DATE,
  type text DEFAULT 'homework' CHECK (type IN ('homework', 'project', 'classwork', 'test', 'other')),
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own assignments" ON public.assignments;
CREATE POLICY "Teachers manage own assignments" ON public.assignments
  FOR ALL USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Students view active assignments" ON public.assignments;
CREATE POLICY "Students view active assignments" ON public.assignments
  FOR SELECT USING (status = 'active' AND auth.uid() IS NOT NULL);

-- =========================================================
-- 3. ASSIGNMENT SUBMISSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  marks_obtained numeric(6,2),
  feedback text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late', 'missing')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage submissions for their assignments" ON public.assignment_submissions;
CREATE POLICY "Teachers manage submissions for their assignments" ON public.assignment_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND a.teacher_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "Students view own submissions" ON public.assignment_submissions;
CREATE POLICY "Students view own submissions" ON public.assignment_submissions
  FOR SELECT USING (student_id = auth.uid());

-- =========================================================
-- 4. CLASS NOTICES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.class_notices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.class_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own notices" ON public.class_notices;
CREATE POLICY "Teachers manage own notices" ON public.class_notices
  FOR ALL USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Students view active notices" ON public.class_notices;
CREATE POLICY "Students view active notices" ON public.class_notices
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- =========================================================
-- 5. TEACHER NOTES (private notes on students)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.teacher_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'academic', 'behavioral', 'attendance', 'positive')),
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.teacher_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own notes" ON public.teacher_notes;
CREATE POLICY "Teachers manage own notes" ON public.teacher_notes
  FOR ALL USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 6. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON public.lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON public.lesson_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_date ON public.lesson_plans(plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_class_notices_class ON public.class_notices(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher ON public.teacher_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_student ON public.teacher_notes(student_id);

-- =========================================================
-- 7. GRANTS
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_notices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_notes TO authenticated;
