-- 006_exams_and_marks.sql

CREATE TABLE public.exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed basic types
INSERT INTO public.exam_types (name) VALUES ('Unit Test'), ('Mid Term'), ('Final');

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  exam_type_id uuid NOT NULL REFERENCES public.exam_types (id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years (id) ON DELETE RESTRICT,
  term_id uuid REFERENCES public.terms (id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE RESTRICT,
  max_marks numeric NOT NULL DEFAULT 100,
  pass_marks numeric NOT NULL DEFAULT 35,
  exam_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, subject_id)
);

CREATE TABLE public.grading_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_percentage numeric NOT NULL,
  max_percentage numeric NOT NULL,
  grade text NOT NULL,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Default grading blocks
INSERT INTO public.grading_system (min_percentage, max_percentage, grade, remark) VALUES 
  (90, 100, 'A+', 'Outstanding'),
  (80, 89.99, 'A', 'Excellent'),
  (70, 79.99, 'B', 'Very Good'),
  (60, 69.99, 'C', 'Good'),
  (50, 59.99, 'D', 'Satisfactory'),
  (35, 49.99, 'E', 'Pass'),
  (0, 34.99, 'F', 'Fail');

CREATE TABLE public.marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
  marks_obtained numeric NOT NULL CHECK (marks_obtained >= 0),
  grade text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);


-- RLS Configuration
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- exam_types & grading_system (Global Read, Admin modify)
CREATE POLICY "Anyone can read exam parameters" ON public.exam_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage exam_types" ON public.exam_types FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

CREATE POLICY "Anyone can read grading_system" ON public.grading_system FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage grading_system" ON public.grading_system FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- exams
CREATE POLICY "Admin manage exams" ON public.exams FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());
CREATE POLICY "Global read exams" ON public.exams FOR SELECT USING (auth.role() = 'authenticated');

-- exam_subjects
CREATE POLICY "Admin manage exam_subjects" ON public.exam_subjects FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());
CREATE POLICY "Global read exam_subjects" ON public.exam_subjects FOR SELECT USING (auth.role() = 'authenticated');

-- marks
CREATE POLICY "Admin manage marks" ON public.marks FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- Teachers can input marks ONLY for subjects they teach
CREATE POLICY "Teachers can UPSERT marks" ON public.marks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.class_subjects cs
    JOIN public.exams e ON e.id = exam_id
    WHERE cs.class_id = e.class_id AND cs.subject_id = marks.subject_id AND cs.teacher_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.exams e ON e.id = exam_id
    WHERE c.id = e.class_id AND c.class_teacher_id = auth.uid() 
  )
);

CREATE POLICY "Teachers can UPDATE marks" ON public.marks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.class_subjects cs
    JOIN public.exams e ON e.id = exam_id
    WHERE cs.class_id = e.class_id AND cs.subject_id = marks.subject_id AND cs.teacher_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.exams e ON e.id = exam_id
    WHERE c.id = e.class_id AND c.class_teacher_id = auth.uid() 
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.class_subjects cs
    JOIN public.exams e ON e.id = exam_id
    WHERE cs.class_id = e.class_id AND cs.subject_id = marks.subject_id AND cs.teacher_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.exams e ON e.id = exam_id
    WHERE c.id = e.class_id AND c.class_teacher_id = auth.uid() 
  )
);

-- Read access based on relations
CREATE POLICY "Read permitted marks" ON public.marks FOR SELECT
USING (
  public.can_configure_school()
  OR student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.class_subjects cs
    JOIN public.exams e ON e.id = exam_id
    WHERE cs.class_id = e.class_id AND cs.teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.exams e ON e.id = exam_id
    WHERE c.id = e.class_id AND c.class_teacher_id = auth.uid() 
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_students ps
    WHERE ps.parent_id = auth.uid() AND ps.student_id = marks.student_id
  )
);
