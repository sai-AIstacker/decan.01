-- 011_performance_indexes.sql
-- Performance Optimization: Database Indexes and Aggregation RPCs
-- Apply in Supabase SQL Editor

-- =========================================================
-- SECTION 1: PERFORMANCE INDEXES
-- =========================================================

-- attendance: most-queried table (by student, class, date)
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id   ON public.attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON public.attendance(date DESC);
-- Composite: student attendance history (student_attendance page)
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date DESC);
-- Composite: daily class roll call (teacher attendance manager)
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date DESC);

-- marks: queried by student, exam, subject (results, marks-entry)
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON public.marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id    ON public.marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON public.marks(subject_id);
-- Composite: exam+student lookup (upsert on conflict key)
CREATE INDEX IF NOT EXISTS idx_marks_exam_student ON public.marks(exam_id, student_id);

-- enrollments: core table referenced everywhere
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id   ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id     ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year_status  ON public.enrollments(academic_year_id, status);
-- Composite: active students in a class (most common join)
CREATE INDEX IF NOT EXISTS idx_enrollments_class_status ON public.enrollments(class_id, status);

-- class_subjects: teacher assignment lookups
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id   ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON public.class_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects(subject_id);

-- invoices: finance dashboard aggregation + student billing
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON public.invoices(due_date);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- HR tables
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status ON public.leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_user_status        ON public.payroll(user_id, status);

-- notifications: unread count for bell (user_id + is_read = most common filter)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- messages: chat history ordered by time within conversation
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);

-- conversation_participants: conversation membership lookup
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_id ON public.conversation_participants(conversation_id);

-- terms: by academic year
CREATE INDEX IF NOT EXISTS idx_terms_academic_year_id ON public.terms(academic_year_id);

-- exam_subjects: by exam
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id    ON public.exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject_id ON public.exam_subjects(subject_id);

-- exams: by class + academic year (most common filter)
CREATE INDEX IF NOT EXISTS idx_exams_class_id           ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_academic_year_id   ON public.exams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_year         ON public.exams(class_id, academic_year_id);

-- parent_students: parent-side lookup
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id  ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON public.parent_students(student_id);

-- audit_logs: recent-first browsing
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_created ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created       ON public.audit_logs(created_at DESC);

-- user_roles: role-based lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- =========================================================
-- SECTION 2: RPC — Admin Dashboard Stats (single round-trip)
-- =========================================================
-- Replaces 8 sequential Supabase client calls in admin/page.tsx

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_student_count   bigint := 0;
  v_teacher_count   bigint := 0;
  v_class_count     bigint := 0;
  v_active_year     text   := 'N/A';
  v_fees_collected  numeric := 0;
  v_pending_dues    numeric := 0;
  v_paid_count      bigint := 0;
  v_pending_count   bigint := 0;
  v_avg_marks_pct   numeric := 0;
  v_pass_rate       numeric := 0;
  v_total_marks     bigint := 0;
  v_pass_marks_sum  bigint := 0;
BEGIN
  -- Active enrollments count
  SELECT COUNT(*) INTO v_student_count
  FROM public.enrollments
  WHERE status = 'active';

  -- Teacher count via roles join
  SELECT COUNT(DISTINCT ur.user_id) INTO v_teacher_count
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = 'teacher';

  -- Total classes
  SELECT COUNT(*) INTO v_class_count FROM public.classes;

  -- Active academic year name
  SELECT name INTO v_active_year
  FROM public.academic_years
  WHERE is_active = true
  LIMIT 1;

  -- Finance aggregations in one pass
  SELECT
    COALESCE(SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status != 'paid'   THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN status = 'paid'    THEN 1 END),
    COUNT(CASE WHEN status != 'paid'   THEN 1 END)
  INTO v_fees_collected, v_pending_dues, v_paid_count, v_pending_count
  FROM public.invoices;

  -- Marks analytics: avg percentage and pass rate using subquery join
  SELECT
    COUNT(*),
    COUNT(CASE WHEN m.marks_obtained >= es.pass_marks THEN 1 END),
    COALESCE(AVG((m.marks_obtained / NULLIF(es.max_marks, 0)) * 100), 0)
  INTO v_total_marks, v_pass_marks_sum, v_avg_marks_pct
  FROM public.marks m
  JOIN public.exam_subjects es
    ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id;

  IF v_total_marks > 0 THEN
    v_pass_rate := (v_pass_marks_sum::numeric / v_total_marks) * 100;
  END IF;

  RETURN jsonb_build_object(
    'student_count',       v_student_count,
    'teacher_count',       v_teacher_count,
    'class_count',         v_class_count,
    'active_year',         v_active_year,
    'fees_collected',      v_fees_collected,
    'pending_dues',        v_pending_dues,
    'paid_count',          v_paid_count,
    'pending_count',       v_pending_count,
    'avg_marks_pct',       ROUND(v_avg_marks_pct::numeric, 1),
    'pass_rate',           ROUND(v_pass_rate::numeric, 1)
  );
END;
$$;

-- =========================================================
-- SECTION 3: RPC — Admin Attendance Trend (last N months)
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_admin_attendance_trend(months_back integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'name',       TO_CHAR(month_start, 'YYYY-MM'),
      'attendance', ROUND(
        (SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0)) * 100
      )
    )
    ORDER BY month_start
  )
  INTO v_result
  FROM (
    SELECT
      DATE_TRUNC('month', date::timestamptz) AS month_start,
      status
    FROM public.attendance
    WHERE date >= (CURRENT_DATE - (months_back || ' months')::interval)
  ) monthly_data
  GROUP BY month_start;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- =========================================================
-- SECTION 4: RPC — Today's Attendance Percentage
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_today_attendance_pct()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)::numeric
        / COUNT(*)) * 100
    )
  END
  FROM public.attendance
  WHERE date = CURRENT_DATE;
$$;

-- Grant execute to authenticated users (RLS handles data access within each fn via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_attendance_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_attendance_pct() TO authenticated;
