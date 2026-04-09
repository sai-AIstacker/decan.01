-- Migration 014: Advanced Accounting System
-- Chart of Accounts, Budgets, Bank Management, Fixed Assets,
-- Journals, Cost Centers, Scholarships, Audit Trail

-- =========================================================
-- ENUMS
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_status') THEN
    CREATE TYPE journal_status AS ENUM ('draft', 'submitted', 'approved', 'posted', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
    CREATE TYPE asset_status AS ENUM ('active', 'disposed', 'under_maintenance', 'fully_depreciated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'depreciation_method') THEN
    CREATE TYPE depreciation_method AS ENUM ('straight_line', 'declining_balance', 'units_of_production');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
    CREATE TYPE reconciliation_status AS ENUM ('in_progress', 'completed', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
  END IF;
END $$;

-- =========================================================
-- 1. CHART OF ACCOUNTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code text NOT NULL UNIQUE,
  name text NOT NULL,
  account_type account_type NOT NULL,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description text,
  status account_status DEFAULT 'active' NOT NULL,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view CoA" ON public.chart_of_accounts;
CREATE POLICY "Authenticated can view CoA" ON public.chart_of_accounts FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can manage CoA" ON public.chart_of_accounts;
CREATE POLICY "Accounting can manage CoA" ON public.chart_of_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Chart of Accounts table is ready. Add accounts via the app.

-- =========================================================
-- 2. COST CENTERS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  department text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view cost centers" ON public.cost_centers;
CREATE POLICY "Authenticated can view cost centers" ON public.cost_centers FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can manage cost centers" ON public.cost_centers;
CREATE POLICY "Accounting can manage cost centers" ON public.cost_centers FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Cost centers table is ready. Add departments via the app.

CREATE TABLE IF NOT EXISTS public.cost_allocations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
  cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  percentage numeric(5, 2),
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.cost_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage cost allocations" ON public.cost_allocations;
CREATE POLICY "Accounting can manage cost allocations" ON public.cost_allocations FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 3. BANK ACCOUNTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  account_number text,
  bank_name text NOT NULL,
  ifsc_code text,
  account_type text DEFAULT 'current',
  current_balance numeric(14, 2) DEFAULT 0.00 NOT NULL,
  opening_balance numeric(14, 2) DEFAULT 0.00 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Accounting can manage bank accounts" ON public.bank_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Bank accounts table is ready. Add accounts via the app.

-- Bank reconciliations
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  statement_balance numeric(14, 2) NOT NULL,
  book_balance numeric(14, 2) NOT NULL,
  difference numeric(14, 2) GENERATED ALWAYS AS (statement_balance - book_balance) STORED,
  status reconciliation_status DEFAULT 'in_progress' NOT NULL,
  notes text,
  reconciled_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage reconciliations" ON public.bank_reconciliations;
CREATE POLICY "Accounting can manage reconciliations" ON public.bank_reconciliations FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 4. BUDGETS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.budget_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view budget periods" ON public.budget_periods;
CREATE POLICY "Authenticated can view budget periods" ON public.budget_periods FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can manage budget periods" ON public.budget_periods;
CREATE POLICY "Accounting can manage budget periods" ON public.budget_periods FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_period_id uuid NOT NULL REFERENCES public.budget_periods(id) ON DELETE CASCADE,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  budgeted_amount numeric(14, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view budget items" ON public.budget_items;
CREATE POLICY "Authenticated can view budget items" ON public.budget_items FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can manage budget items" ON public.budget_items;
CREATE POLICY "Accounting can manage budget items" ON public.budget_items FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Budget periods table is ready. Create your financial year via the app.

-- =========================================================
-- 5. JOURNAL ENTRIES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL,
  description text NOT NULL,
  entry_date date DEFAULT CURRENT_DATE NOT NULL,
  status journal_status DEFAULT 'draft' NOT NULL,
  is_recurring boolean DEFAULT false NOT NULL,
  recurrence_rule text, -- e.g. 'monthly', 'quarterly'
  next_recurrence_date date,
  supporting_document_url text,
  created_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage journals" ON public.journal_entries;
CREATE POLICY "Accounting can manage journals" ON public.journal_entries FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  entry_type ledger_entry_type NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage journal lines" ON public.journal_entry_lines;
CREATE POLICY "Accounting can manage journal lines" ON public.journal_entry_lines FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 6. FIXED ASSETS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  purchase_date date NOT NULL,
  purchase_cost numeric(14, 2) NOT NULL CHECK (purchase_cost >= 0),
  salvage_value numeric(14, 2) DEFAULT 0 NOT NULL,
  useful_life_years integer NOT NULL DEFAULT 5,
  depreciation_method depreciation_method DEFAULT 'straight_line' NOT NULL,
  accumulated_depreciation numeric(14, 2) DEFAULT 0 NOT NULL,
  current_book_value numeric(14, 2) GENERATED ALWAYS AS (purchase_cost - accumulated_depreciation) STORED,
  status asset_status DEFAULT 'active' NOT NULL,
  disposal_date date,
  disposal_amount numeric(14, 2),
  location text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage fixed assets" ON public.fixed_assets;
CREATE POLICY "Accounting can manage fixed assets" ON public.fixed_assets FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Authenticated can view fixed assets" ON public.fixed_assets;
CREATE POLICY "Authenticated can view fixed assets" ON public.fixed_assets FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fixed assets table is ready. Register assets via the app.

-- =========================================================
-- 7. SCHOLARSHIPS
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scholarship_type') THEN
    CREATE TYPE scholarship_type AS ENUM ('full', 'partial', 'merit', 'need_based', 'sports', 'sibling');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  type scholarship_type NOT NULL DEFAULT 'partial',
  discount_percentage numeric(5, 2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  fixed_amount numeric(12, 2),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view scholarships" ON public.scholarships;
CREATE POLICY "Authenticated can view scholarships" ON public.scholarships FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can manage scholarships" ON public.scholarships;
CREATE POLICY "Accounting can manage scholarships" ON public.scholarships FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

CREATE TABLE IF NOT EXISTS public.scholarship_allocations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  allocated_amount numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (scholarship_id, student_id, academic_year)
);

ALTER TABLE public.scholarship_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Accounting can manage scholarship allocations" ON public.scholarship_allocations;
CREATE POLICY "Accounting can manage scholarship allocations" ON public.scholarship_allocations FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Scholarships table is ready. Add scholarship programs via the app.

-- =========================================================
-- 8. AUDIT TRAIL
-- =========================================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action audit_action NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit trail" ON public.audit_trail;
CREATE POLICY "Admins can view audit trail" ON public.audit_trail FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "System can insert audit trail" ON public.audit_trail;
CREATE POLICY "System can insert audit trail" ON public.audit_trail FOR INSERT WITH CHECK (true);

-- Audit trail trigger function
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, new_values)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, old_values)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key financial tables
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

DROP TRIGGER IF EXISTS audit_journal_entries ON public.journal_entries;
CREATE TRIGGER audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- =========================================================
-- 9. PERFORMANCE INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_coa_parent_id ON public.chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_account_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON public.fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON public.audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON public.audit_trail(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_items_period ON public.budget_items(budget_period_id);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_center ON public.cost_allocations(cost_center_id);
