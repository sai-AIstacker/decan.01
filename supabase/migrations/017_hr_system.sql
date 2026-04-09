-- Migration 017: Complete HR System
-- Staff profiles, departments, leave types, payroll enhancements,
-- performance reviews, staff attendance, announcements

-- =========================================================
-- 1. DEPARTMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  head_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "HR can manage departments" ON public.departments;
CREATE POLICY "HR can manage departments" ON public.departments FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 2. STAFF PROFILES (extends profiles)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  designation text,
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  date_of_joining date,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_account_number text,
  bank_name text,
  ifsc_code text,
  pan_number text,
  base_salary numeric(12, 2) DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff_profiles;
CREATE POLICY "Staff can view own profile" ON public.staff_profiles FOR SELECT USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP POLICY IF EXISTS "HR can manage staff profiles" ON public.staff_profiles;
CREATE POLICY "HR can manage staff profiles" ON public.staff_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 3. LEAVE TYPES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.leave_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  days_allowed integer NOT NULL DEFAULT 0,
  is_paid boolean DEFAULT true NOT NULL,
  carry_forward boolean DEFAULT false NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view leave types" ON public.leave_types;
CREATE POLICY "Authenticated can view leave types" ON public.leave_types FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "HR can manage leave types" ON public.leave_types;
CREATE POLICY "HR can manage leave types" ON public.leave_types FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Default leave types
INSERT INTO public.leave_types (name, code, days_allowed, is_paid, carry_forward) VALUES
  ('Casual Leave', 'CL', 12, true, false),
  ('Sick Leave', 'SL', 10, true, false),
  ('Earned Leave', 'EL', 15, true, true),
  ('Maternity Leave', 'ML', 180, true, false),
  ('Paternity Leave', 'PL', 15, true, false),
  ('Loss of Pay', 'LOP', 0, false, false),
  ('Compensatory Off', 'CO', 0, true, false)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 4. ENHANCE LEAVE REQUESTS (add leave_type_id, approver, notes)
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'leave_type_id') THEN
    ALTER TABLE public.leave_requests ADD COLUMN leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'approved_by') THEN
    ALTER TABLE public.leave_requests ADD COLUMN approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'approved_at') THEN
    ALTER TABLE public.leave_requests ADD COLUMN approved_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'rejection_reason') THEN
    ALTER TABLE public.leave_requests ADD COLUMN rejection_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'total_days') THEN
    ALTER TABLE public.leave_requests ADD COLUMN total_days integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'is_half_day') THEN
    ALTER TABLE public.leave_requests ADD COLUMN is_half_day boolean DEFAULT false;
  END IF;
END $$;

-- =========================================================
-- 5. ENHANCE PAYROLL (add more fields)
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'basic_salary') THEN
    ALTER TABLE public.payroll ADD COLUMN basic_salary numeric(12, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'allowances') THEN
    ALTER TABLE public.payroll ADD COLUMN allowances numeric(12, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'deductions') THEN
    ALTER TABLE public.payroll ADD COLUMN deductions numeric(12, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'net_salary') THEN
    ALTER TABLE public.payroll ADD COLUMN net_salary numeric(12, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'payment_date') THEN
    ALTER TABLE public.payroll ADD COLUMN payment_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'payment_method') THEN
    ALTER TABLE public.payroll ADD COLUMN payment_method text DEFAULT 'bank_transfer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'notes') THEN
    ALTER TABLE public.payroll ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll' AND column_name = 'processed_by') THEN
    ALTER TABLE public.payroll ADD COLUMN processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- 6. STAFF ATTENDANCE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in time,
  check_out time,
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes text,
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (staff_id, date)
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view own attendance" ON public.staff_attendance;
CREATE POLICY "Staff can view own attendance" ON public.staff_attendance FOR SELECT USING (staff_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP POLICY IF EXISTS "HR can manage staff attendance" ON public.staff_attendance;
CREATE POLICY "HR can manage staff attendance" ON public.staff_attendance FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 7. PERFORMANCE REVIEWS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_period text NOT NULL,  -- e.g. "2025-Q1", "2025-Annual"
  review_date date NOT NULL,
  overall_rating numeric(3, 1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  teaching_quality numeric(3, 1),
  punctuality numeric(3, 1),
  teamwork numeric(3, 1),
  communication numeric(3, 1),
  strengths text,
  areas_for_improvement text,
  goals_next_period text,
  comments text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view own reviews" ON public.performance_reviews;
CREATE POLICY "Staff can view own reviews" ON public.performance_reviews FOR SELECT USING (staff_id = auth.uid() OR reviewer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP POLICY IF EXISTS "HR can manage reviews" ON public.performance_reviews;
CREATE POLICY "HR can manage reviews" ON public.performance_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 8. HR ANNOUNCEMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.hr_announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_roles text[] DEFAULT ARRAY['teacher', 'hr', 'accounting', 'admin'],
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view announcements" ON public.hr_announcements;
CREATE POLICY "Staff can view announcements" ON public.hr_announcements FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
DROP POLICY IF EXISTS "HR can manage announcements" ON public.hr_announcements;
CREATE POLICY "HR can manage announcements" ON public.hr_announcements FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 9. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_staff_profiles_department ON public.staff_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON public.payroll(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.payroll(month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON public.staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON public.staff_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_staff ON public.performance_reviews(staff_id);

-- =========================================================
-- 10. GRANTS
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_announcements TO authenticated;
