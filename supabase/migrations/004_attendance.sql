-- 004_attendance.sql

CREATE TABLE public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_start_time time NOT NULL DEFAULT '08:00:00',
  late_after_minutes integer NOT NULL DEFAULT 15,
  half_day_after_minutes integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert a single default configuration row
INSERT INTO public.attendance_settings (id) VALUES (gen_random_uuid());

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects (id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  marked_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate entries logically. NULLS NOT DISTINCT ensures multiple NULL subjects logically collide.
-- This requires PostgreSQL >= 15 natively supported by Supabase.
CREATE UNIQUE INDEX idx_attendance_unique ON public.attendance (student_id, class_id, subject_id, date) NULLS NOT DISTINCT;

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 1. Attendance Settings RLS
CREATE POLICY "Anyone can read attendance_settings" ON public.attendance_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage attendance_settings" ON public.attendance_settings FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- 2. Attendance RLS
-- Admin full access
CREATE POLICY "Admin full access attendance" ON public.attendance FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- Teachers can Insert/Update attendance where they are explicitly assigned the class/subject block
CREATE POLICY "Teachers modify active attendance" ON public.attendance FOR INSERT
WITH CHECK (
  auth.uid() = marked_by AND (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.class_teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = class_id AND (cs.subject_id = attendance.subject_id OR attendance.subject_id IS NULL) AND cs.teacher_id = auth.uid())
  )
);

CREATE POLICY "Teachers update active attendance" ON public.attendance FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.class_teacher_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = class_id AND (cs.subject_id = attendance.subject_id OR attendance.subject_id IS NULL) AND cs.teacher_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.class_teacher_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = class_id AND (cs.subject_id = attendance.subject_id OR attendance.subject_id IS NULL) AND cs.teacher_id = auth.uid())
);

-- Readers (Teacher, Student, Parent)
CREATE POLICY "Read permitted attendance" ON public.attendance FOR SELECT
USING (
  -- I am the student
  student_id = auth.uid() OR
  -- I am the parent of the student
  EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = attendance.student_id) OR
  -- I am a teacher for this class
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.class_teacher_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = class_id AND cs.teacher_id = auth.uid())
);
