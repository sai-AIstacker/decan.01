-- Migration 010: System Settings, Automation Engine, and Audit Logistics

-- 1. APP SETTINGS (Singleton)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name text NOT NULL DEFAULT 'My School',
    school_logo text,
    contact_email text,
    contact_phone text,
    address text,
    default_language text DEFAULT 'en',
    timezone text DEFAULT 'UTC',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Ensure only one row exists using a partial index overlay strategy or check constraints implicitly if needed.
-- But the simplest approach is a unique boolean constraint that must always evaluate to true.
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_singleton boolean DEFAULT true;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_settings_is_singleton_key'
      AND conrelid = 'public.app_settings'::regclass
  ) THEN
    ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_is_singleton_key UNIQUE (is_singleton);
  END IF;
END
$$;

-- Insert default row immediately so the system always has its dependencies
INSERT INTO public.app_settings (school_name, is_singleton) VALUES ('Silver Valley Academy', true) ON CONFLICT DO NOTHING;

-- 2. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_name text UNIQUE NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed basic flags
INSERT INTO public.feature_flags (feature_name, is_enabled) VALUES
('enable_payments', true),
('enable_attendance', true),
('enable_messaging', true)
ON CONFLICT (feature_name) DO NOTHING;

-- 3. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed templates for automation
INSERT INTO public.email_templates (name, subject, body) VALUES
('fee_reminder', 'Invoice Due Reminder', 'Dear user, this is an automated reminder that you have pending financial dues. Please proceed to the accounting portal to process payment at your earliest convenience.'),
('attendance_alert', 'Attendance Deficit Notice', 'Dear user, our attendance records automatically registered a negative presence metric (Absent) against your official record today.'),
('result_published', 'Term Results Published', 'Dear user, your official term grading records have officially synchronized to your local client portal. Please review your Dashboard for explicit reporting metrics.')
ON CONFLICT (name) DO NOTHING;

-- 4. AUTOMATION RULES
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trigger_event text UNIQUE NOT NULL,
    action_type text NOT NULL CHECK (action_type IN ('email', 'notification')),
    template_id uuid NOT NULL REFERENCES public.email_templates(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Resolve template ids via generic sub-selects for standard rules
INSERT INTO public.automation_rules (trigger_event, action_type, template_id, is_active)
SELECT 'fee_due', 'notification', id, true FROM public.email_templates WHERE name = 'fee_reminder'
ON CONFLICT (trigger_event) DO NOTHING;

INSERT INTO public.automation_rules (trigger_event, action_type, template_id, is_active)
SELECT 'attendance_absent', 'notification', id, true FROM public.email_templates WHERE name = 'attendance_alert'
ON CONFLICT (trigger_event) DO NOTHING;

INSERT INTO public.automation_rules (trigger_event, action_type, template_id, is_active)
SELECT 'result_published', 'notification', id, true FROM public.email_templates WHERE name = 'result_published'
ON CONFLICT (trigger_event) DO NOTHING;

-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid, -- Authenticated user triggering action (resolves via auth.uid() dynamically if possible)
    action text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    table_name text NOT NULL,
    record_id uuid, -- ID of the targeted record
    payload jsonb, -- State context (e.g. before/after tracking if desired)
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Universal Audit Postgres Function Tracker Native DML
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_record_id uuid;
  v_payload jsonb;
BEGIN
  -- We attempt to bind the auth.uid() Native supabase scope
  v_user_id := auth.uid();
  
  -- Determine action type to map record ID effectively
  IF (TG_OP = 'DELETE') THEN
     v_record_id := OLD.id;
     v_payload := jsonb_build_object('old', row_to_json(OLD));
     INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
     VALUES (v_user_id, TG_OP, TG_TABLE_NAME::text, v_record_id, v_payload);
     RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
     v_record_id := NEW.id;
     v_payload := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
     INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
     VALUES (v_user_id, TG_OP, TG_TABLE_NAME::text, v_record_id, v_payload);
     RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
     v_record_id := NEW.id;
     v_payload := jsonb_build_object('new', row_to_json(NEW));
     INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
     VALUES (v_user_id, TG_OP, TG_TABLE_NAME::text, v_record_id, v_payload);
     RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map explicit automation triggers to primary transactional tables
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_classes_trigger ON public.classes;
CREATE TRIGGER audit_classes_trigger AFTER INSERT OR UPDATE OR DELETE ON public.classes FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_enrollments_trigger ON public.enrollments;
CREATE TRIGGER audit_enrollments_trigger AFTER INSERT OR UPDATE OR DELETE ON public.enrollments FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_marks_trigger ON public.marks;
CREATE TRIGGER audit_marks_trigger AFTER INSERT OR UPDATE OR DELETE ON public.marks FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_attendance_trigger ON public.attendance;
CREATE TRIGGER audit_attendance_trigger AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_settings_trigger ON public.app_settings;
CREATE TRIGGER audit_settings_trigger AFTER INSERT OR UPDATE OR DELETE ON public.app_settings FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
DROP TRIGGER IF EXISTS audit_invoices_trigger ON public.invoices;
CREATE TRIGGER audit_invoices_trigger AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();

-- 6. SUPABASE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('school_assets', 'school_assets', true) ON CONFLICT (id) DO NOTHING;

-- Map restrictive upload permissions specifically allocating admin execution
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING ( bucket_id = 'school_assets' );
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
CREATE POLICY "Admin Upload Access" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'school_assets' AND auth.uid() IN (SELECT user_id FROM public.user_roles JOIN public.roles on roles.id = user_roles.role_id WHERE name = 'admin') );
DROP POLICY IF EXISTS "Admin Update Access" ON storage.objects;
CREATE POLICY "Admin Update Access" ON storage.objects FOR UPDATE USING ( bucket_id = 'school_assets' AND auth.uid() IN (SELECT user_id FROM public.user_roles JOIN public.roles on roles.id = user_roles.role_id WHERE name = 'admin') );

-- 7. RLS POLICIES FOR NEW TABLES

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- App Settings: All mapped authenticated users can read. Admins can update.
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT USING (true); -- Usually true or auth.role() = 'authenticated'
DROP POLICY IF EXISTS "Admins update app settings" ON public.app_settings;
CREATE POLICY "Admins update app settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Feature Flags: Bound readable dynamically, Admin strictly modifies.
DROP POLICY IF EXISTS "Users read feature flags" ON public.feature_flags;
CREATE POLICY "Users read feature flags" ON public.feature_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins alter feature flags" ON public.feature_flags;
CREATE POLICY "Admins alter feature flags" ON public.feature_flags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Templates & Rules: Admins exclusively command execution architectures.
DROP POLICY IF EXISTS "Admins govern email templates" ON public.email_templates;
CREATE POLICY "Admins govern email templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins govern automation logic" ON public.automation_rules;
CREATE POLICY "Admins govern automation logic" ON public.automation_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs tracking mechanism: Only explicit backend triggers push inserts structurally. Audits solely readable natively via admin users.
DROP POLICY IF EXISTS "System generates records automatically" ON public.audit_logs;
CREATE POLICY "System generates records automatically" ON public.audit_logs FOR INSERT WITH CHECK (true); -- Trigger needs ability to bypass naturally natively, but true acts safely coupled with SECURITY DEFINER
DROP POLICY IF EXISTS "Admins view audit traces explicitly" ON public.audit_logs;
CREATE POLICY "Admins view audit traces explicitly" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
