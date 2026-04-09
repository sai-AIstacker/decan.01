-- Migration 019: Dashboard Enhancements
-- Adds parent_students table, notifications, and improved RPC functions

-- =========================================================
-- 1. PARENT-STUDENT LINK TABLE (if not exists)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.parent_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(parent_id, student_id)
);

ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view own links" ON public.parent_students;
CREATE POLICY "Parents view own links" ON public.parent_students FOR SELECT USING (parent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin manage parent links" ON public.parent_students;
CREATE POLICY "Admin manage parent links" ON public.parent_students FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. IN-APP NOTIFICATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'fee', 'attendance', 'result', 'assignment')),
  is_read boolean DEFAULT false NOT NULL,
  action_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);

-- =========================================================
-- 3. ENHANCED ADMIN STATS RPC (adds more metrics)
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_count   integer;
  v_teacher_count   integer;
  v_class_count     integer;
  v_active_year     text;
  v_fees_collected  numeric;
  v_pending_dues    numeric;
  v_paid_count      integer;
  v_pending_count   integer;
  v_avg_marks_pct   numeric;
  v_pass_rate       numeric;
  v_total_subjects  integer;
  v_total_exams     integer;
  v_active_year_id  uuid;
BEGIN
  -- Active academic year
  SELECT id, name INTO v_active_year_id, v_active_year
  FROM public.academic_years WHERE is_active = true LIMIT 1;

  -- Student count (active enrollments)
  SELECT COUNT(DISTINCT student_id) INTO v_student_count
  FROM public.enrollments WHERE status = 'active';

  -- Teacher count
  SELECT COUNT(DISTINCT ur.user_id) INTO v_teacher_count
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = 'teacher';

  -- Class count (active year)
  SELECT COUNT(*) INTO v_class_count
  FROM public.classes
  WHERE (v_active_year_id IS NULL OR academic_year_id = v_active_year_id);

  -- Subject count
  SELECT COUNT(*) INTO v_total_subjects FROM public.subjects;

  -- Exam count
  SELECT COUNT(*) INTO v_total_exams FROM public.exams
  WHERE (v_active_year_id IS NULL OR academic_year_id = v_active_year_id);

  -- Fee stats
  SELECT
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN status = 'paid' THEN 1 END),
    COUNT(CASE WHEN status != 'paid' THEN 1 END)
  INTO v_fees_collected, v_pending_dues, v_paid_count, v_pending_count
  FROM public.invoices;

  -- Academic performance
  SELECT
    COALESCE(AVG(m.marks_obtained / NULLIF(es.max_marks, 0) * 100), 0),
    COALESCE(
      COUNT(CASE WHEN m.marks_obtained >= es.pass_marks THEN 1 END)::numeric /
      NULLIF(COUNT(*), 0) * 100, 0
    )
  INTO v_avg_marks_pct, v_pass_rate
  FROM public.marks m
  JOIN public.exam_subjects es ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id;

  RETURN jsonb_build_object(
    'student_count',    v_student_count,
    'teacher_count',    v_teacher_count,
    'class_count',      v_class_count,
    'active_year',      COALESCE(v_active_year, 'N/A'),
    'fees_collected',   v_fees_collected,
    'pending_dues',     v_pending_dues,
    'paid_count',       v_paid_count,
    'pending_count',    v_pending_count,
    'avg_marks_pct',    ROUND(v_avg_marks_pct, 1),
    'pass_rate',        ROUND(v_pass_rate, 1),
    'total_subjects',   v_total_subjects,
    'total_exams',      v_total_exams
  );
END;
$$;

-- =========================================================
-- 4. STUDENT DASHBOARD STATS RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_student_dashboard_stats(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_name      text;
  v_att_pct         numeric;
  v_perf_pct        numeric;
  v_exams_count     integer;
  v_pending_fees    numeric;
  v_assignments     integer;
BEGIN
  -- Class name
  SELECT c.name || ' ' || c.section INTO v_class_name
  FROM public.enrollments e
  JOIN public.classes c ON c.id = e.class_id
  WHERE e.student_id = p_student_id AND e.status = 'active'
  ORDER BY e.created_at DESC LIMIT 1;

  -- Attendance %
  SELECT
    COALESCE(
      COUNT(CASE WHEN status IN ('present','late') THEN 1 END)::numeric /
      NULLIF(COUNT(*), 0) * 100, 0
    ) INTO v_att_pct
  FROM public.attendance WHERE student_id = p_student_id;

  -- Performance %
  SELECT
    COALESCE(
      SUM(m.marks_obtained) / NULLIF(SUM(es.max_marks), 0) * 100, 0
    ) INTO v_perf_pct
  FROM public.marks m
  JOIN public.exam_subjects es ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id
  WHERE m.student_id = p_student_id;

  -- Exams attempted
  SELECT COUNT(DISTINCT exam_id) INTO v_exams_count
  FROM public.marks WHERE student_id = p_student_id;

  -- Pending fees
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_fees
  FROM public.invoices WHERE student_id = p_student_id AND status != 'paid';

  -- Active assignments
  SELECT COUNT(*) INTO v_assignments
  FROM public.assignments a
  JOIN public.enrollments e ON e.class_id = a.class_id
  WHERE e.student_id = p_student_id AND a.status = 'active' AND a.due_date >= CURRENT_DATE;

  RETURN jsonb_build_object(
    'class_name',     COALESCE(v_class_name, 'Not Enrolled'),
    'att_pct',        ROUND(v_att_pct, 1),
    'perf_pct',       ROUND(v_perf_pct, 1),
    'exams_count',    v_exams_count,
    'pending_fees',   v_pending_fees,
    'assignments',    v_assignments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_dashboard_stats(uuid) TO authenticated;

-- =========================================================
-- 5. PARENT DASHBOARD STATS RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_parent_dashboard_stats(p_parent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_count     integer;
  v_att_pct         numeric;
  v_perf_pct        numeric;
  v_paid_fees       numeric;
  v_pending_fees    numeric;
  v_student_ids     uuid[];
BEGIN
  SELECT ARRAY_AGG(student_id) INTO v_student_ids
  FROM public.parent_students WHERE parent_id = p_parent_id;

  v_child_count := COALESCE(array_length(v_student_ids, 1), 0);

  IF v_child_count = 0 THEN
    RETURN jsonb_build_object('child_count', 0, 'att_pct', 0, 'perf_pct', 0, 'paid_fees', 0, 'pending_fees', 0);
  END IF;

  SELECT COALESCE(COUNT(CASE WHEN status IN ('present','late') THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100, 0)
  INTO v_att_pct FROM public.attendance WHERE student_id = ANY(v_student_ids);

  SELECT COALESCE(SUM(m.marks_obtained) / NULLIF(SUM(es.max_marks),0) * 100, 0)
  INTO v_perf_pct
  FROM public.marks m
  JOIN public.exam_subjects es ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id
  WHERE m.student_id = ANY(v_student_ids);

  SELECT
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0)
  INTO v_paid_fees, v_pending_fees
  FROM public.invoices WHERE student_id = ANY(v_student_ids);

  RETURN jsonb_build_object(
    'child_count',    v_child_count,
    'att_pct',        ROUND(v_att_pct, 1),
    'perf_pct',       ROUND(v_perf_pct, 1),
    'paid_fees',      v_paid_fees,
    'pending_fees',   v_pending_fees
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_dashboard_stats(uuid) TO authenticated;

-- =========================================================
-- 6. GRANTS
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
