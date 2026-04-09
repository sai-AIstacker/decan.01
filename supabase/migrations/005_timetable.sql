-- 005_timetable.sql

-- 1. Time Slots Table
CREATE TABLE public.time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- e.g. "Period 1"
  start_time time NOT NULL,
  end_time time NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_index) -- Usually you want strict ordering
);

-- 2. Timetables Table
CREATE TABLE public.timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  time_slot_id uuid NOT NULL REFERENCES public.time_slots (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Protect against Class Conflict (One Subject per class per time block)
CREATE UNIQUE INDEX idx_timetable_class_conflict ON public.timetables (class_id, day_of_week, time_slot_id);

-- Protect against Teacher Double Booking (One Teacher can't be in 2 classes per time block)
CREATE UNIQUE INDEX idx_timetable_teacher_conflict ON public.timetables (teacher_id, day_of_week, time_slot_id);

-- RLS
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Time Slots (Global Read)
CREATE POLICY "Anyone can read time_slots" ON public.time_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage time_slots" ON public.time_slots FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- Timetable
-- Admin
CREATE POLICY "Admin manage timetables" ON public.timetables FOR ALL USING (public.can_configure_school()) WITH CHECK (public.can_configure_school());

-- Read access based on relations
CREATE POLICY "Read permitted timetables" ON public.timetables FOR SELECT
USING (
  public.can_configure_school()
  OR teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.class_id = timetables.class_id AND e.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.enrollments e ON e.student_id = ps.student_id
    WHERE ps.parent_id = auth.uid() AND e.class_id = timetables.class_id
  )
);
