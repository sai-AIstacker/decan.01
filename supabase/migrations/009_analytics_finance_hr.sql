-- Migration 009: Analytics, Finance, and HR Tracking

-- 1. Finance Tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'online');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric(10, 2) NOT NULL DEFAULT 0.00,
    due_date date NOT NULL,
    status invoice_status DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount_paid numeric(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_date timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by uuid REFERENCES public.profiles(id)
);

-- 2. HR Tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
    CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status') THEN
    CREATE TYPE payroll_status AS ENUM ('pending', 'paid');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status leave_status DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payroll (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month date NOT NULL, -- First day of the month usually
    amount numeric(10, 2) NOT NULL,
    status payroll_status DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Row Level Security Setup

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- INVOICES: Students/Parents can view their own. Admins/Accounting see all.
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting') OR public.has_role(auth.uid(), 'parent'));
DROP POLICY IF EXISTS "Accounting can insert invoices" ON public.invoices;
CREATE POLICY "Accounting can insert invoices" ON public.invoices FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Accounting can update invoices" ON public.invoices;
CREATE POLICY "Accounting can update invoices" ON public.invoices FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- PAYMENTS: Students/Parents see their own. Admin/Accounting see all.
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.student_id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting') OR public.has_role(auth.uid(), 'parent')
);
DROP POLICY IF EXISTS "Accounting can insert payments" ON public.payments;
CREATE POLICY "Accounting can insert payments" ON public.payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- LEAVE REQUESTS: Users view their own, HR/Admin view all.
DROP POLICY IF EXISTS "Users view own leave reqs" ON public.leave_requests;
CREATE POLICY "Users view own leave reqs" ON public.leave_requests FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP POLICY IF EXISTS "Users insert own leave reqs" ON public.leave_requests;
CREATE POLICY "Users insert own leave reqs" ON public.leave_requests FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "HR updates leave reqs" ON public.leave_requests;
CREATE POLICY "HR updates leave reqs" ON public.leave_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- PAYROLL: Users view their own, HR/Admin/Accounting view all.
DROP POLICY IF EXISTS "Users view own payroll" ON public.payroll;
CREATE POLICY "Users view own payroll" ON public.payroll FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "HR inserts payroll" ON public.payroll;
CREATE POLICY "HR inserts payroll" ON public.payroll FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "HR updates payroll" ON public.payroll;
CREATE POLICY "HR updates payroll" ON public.payroll FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'accounting'));

-- 5. Helper Analytics Functions

-- Function: get_teacher_class_analytics
-- Use case: Fast stats for teacher dashboard
CREATE OR REPLACE FUNCTION public.get_teacher_analytics(target_teacher_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_classes_assigned integer;
  v_students_taught integer;
  v_avg_marks numeric;
BEGIN
  -- Total distinct classes assigned (Homeroom + Subject specific)
  SELECT COUNT(DISTINCT c.id) INTO v_classes_assigned 
  FROM public.classes c 
  WHERE c.class_teacher_id = target_teacher_id 
     OR EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = c.id AND cs.teacher_id = target_teacher_id);
     
  -- Students in those classes
  SELECT COUNT(DISTINCT e.student_id) INTO v_students_taught
  FROM public.enrollments e
  WHERE e.status = 'active' AND e.class_id IN (
      SELECT id FROM public.classes c 
      WHERE c.class_teacher_id = target_teacher_id 
         OR EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = c.id AND cs.teacher_id = target_teacher_id)
  );
  
  -- Simple average marks across all subjects taught by this teacher
  SELECT COALESCE(AVG(m.marks_obtained), 0) INTO v_avg_marks
  FROM public.marks m
  WHERE m.subject_id IN (SELECT subject_id FROM public.class_subjects WHERE teacher_id = target_teacher_id);

  RETURN jsonb_build_object(
      'classes_assigned', coalesce(v_classes_assigned, 0),
      'students_taught', coalesce(v_students_taught, 0),
      'avg_marks', coalesce(v_avg_marks, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: generate_finance_demo_data
-- Safely seeds mock finance data for testing dashboard functionality.
CREATE OR REPLACE FUNCTION public.generate_finance_demo_data() RETURNS VOID AS $$
DECLARE
  student_record RECORD;
  inv_id uuid;
  inv_status invoice_status;
  staff_record RECORD;
BEGIN
  -- Insert random invoices for all students
  FOR student_record IN SELECT student_id FROM public.enrollments WHERE status = 'active' LIMIT 50 LOOP
    INSERT INTO public.invoices (student_id, title, amount, due_date, status)
    VALUES (
      student_record.student_id, 
      'Term 1 Tuition Fee', 
      1500.00, 
      CURRENT_DATE + INTERVAL '30 days',
      (CASE WHEN random() > 0.5 THEN 'paid'::invoice_status ELSE 'pending'::invoice_status END)
    ) RETURNING id, status INTO inv_id, inv_status;
    
    IF inv_status = 'paid' THEN
        INSERT INTO public.payments (invoice_id, amount_paid, payment_method)
        VALUES (inv_id, 1500.00, 'card');
    END IF;
  END LOOP;
  
  -- Insert dummy staff payload
  FOR staff_record IN SELECT user_id FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name IN ('teacher', 'hr', 'accounting') LIMIT 20 LOOP
      INSERT INTO public.leave_requests (user_id, start_date, end_date, reason, status)
      VALUES (staff_record.user_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'Sick leave', 'pending');
      
      INSERT INTO public.payroll (user_id, month, amount, status)
      VALUES (staff_record.user_id, date_trunc('month', CURRENT_DATE), 3500.00, 'pending');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
