-- Migration 015: Accounting System Fixes & Enhancements
-- Fixes column mismatches, adds missing columns, corrects generated column conflicts,
-- and ensures all accounting features work with real user data.

-- =========================================================
-- 1. FIX journal_entry_lines: column name mismatch
--    Code uses journal_entry_id but table has journal_id
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entry_lines' AND column_name = 'journal_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entry_lines' AND column_name = 'journal_entry_id'
  ) THEN
    ALTER TABLE public.journal_entry_lines RENAME COLUMN journal_id TO journal_entry_id;
  END IF;
END $$;

-- Also add account_code column if missing (code stores it for display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_entry_lines' AND column_name = 'account_code'
  ) THEN
    ALTER TABLE public.journal_entry_lines ADD COLUMN account_code text;
  END IF;
END $$;

-- =========================================================
-- 2. FIX bank_reconciliations: difference is GENERATED
--    Remove the generated constraint so we can insert it manually
--    (Supabase doesn't allow inserting into generated columns)
-- =========================================================

DO $$
BEGIN
  -- Drop the generated column and recreate as regular column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_reconciliations'
      AND column_name = 'difference'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.bank_reconciliations DROP COLUMN difference;
    ALTER TABLE public.bank_reconciliations ADD COLUMN difference numeric(14, 2) DEFAULT 0;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_reconciliations'
      AND column_name = 'difference'
  ) THEN
    ALTER TABLE public.bank_reconciliations ADD COLUMN difference numeric(14, 2) DEFAULT 0;
  END IF;
END $$;

-- Add created_by column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_reconciliations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.bank_reconciliations ADD COLUMN created_by uuid REFERENCES public.profiles(id);
  END IF;
END $$;

-- =========================================================
-- 3. FIX fixed_assets: current_book_value is GENERATED
--    Drop generated column, make it a regular updatable column
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fixed_assets'
      AND column_name = 'current_book_value'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.fixed_assets DROP COLUMN current_book_value;
    ALTER TABLE public.fixed_assets ADD COLUMN current_book_value numeric(14, 2);
    -- Backfill existing rows
    UPDATE public.fixed_assets SET current_book_value = purchase_cost - accumulated_depreciation;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fixed_assets'
      AND column_name = 'current_book_value'
  ) THEN
    ALTER TABLE public.fixed_assets ADD COLUMN current_book_value numeric(14, 2);
    UPDATE public.fixed_assets SET current_book_value = purchase_cost - accumulated_depreciation;
  END IF;
END $$;

-- Add vendor column to fixed_assets if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_assets' AND column_name = 'vendor'
  ) THEN
    ALTER TABLE public.fixed_assets ADD COLUMN vendor text;
  END IF;
END $$;

-- =========================================================
-- 4. FIX budget_items: add missing parent_id reference
--    The code references budget_period_id which already exists
--    but ensure cost_center_id FK is correct
-- =========================================================

-- Ensure budget_items has correct FK name (budget_period_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'period_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_items' AND column_name = 'budget_period_id'
  ) THEN
    ALTER TABLE public.budget_items RENAME COLUMN period_id TO budget_period_id;
  END IF;
END $$;

-- =========================================================
-- 5. FIX cost_centers: add parent_id for hierarchy support
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.cost_centers ADD COLUMN parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- 6. FIX profiles: ensure role column exists for student queries
--    The code queries profiles with .eq("role", "student")
--    but profiles may use user_roles join table instead
-- =========================================================

-- Add a computed/denormalized role column if it doesn't exist
-- This is a view-based approach for the student selector
CREATE OR REPLACE VIEW public.student_profiles AS
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p.id AND r.name = 'student'
  );

-- =========================================================
-- 7. FIX invoices: add description column used in create form
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN description text;
  END IF;
END $$;

-- =========================================================
-- 8. FIX transactions: ensure transaction_date accepts date strings
--    (code passes ISO strings, column is timestamptz — OK)
--    Add missing index for performance
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);

-- =========================================================
-- 9. FIX RLS: ensure accounting role can DELETE invoices
--    (needed for void/cancel operations)
-- =========================================================

DROP POLICY IF EXISTS "Accounting can delete invoices" ON public.invoices;
CREATE POLICY "Accounting can delete invoices" ON public.invoices
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Allow accounting to delete payments (for corrections)
DROP POLICY IF EXISTS "Accounting can delete payments" ON public.payments;
CREATE POLICY "Accounting can delete payments" ON public.payments
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Allow accounting to update payments
DROP POLICY IF EXISTS "Accounting can update payments" ON public.payments;
CREATE POLICY "Accounting can update payments" ON public.payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 10. FIX finance_categories: allow DELETE for cleanup
-- =========================================================

DROP POLICY IF EXISTS "Accounting can delete finance categories" ON public.finance_categories;
CREATE POLICY "Accounting can delete finance categories" ON public.finance_categories
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 11. ADD accounting_transactions table
--     Used by the double-entry engine (lib/accounting/engine.ts)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.accounting_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  description text NOT NULL,
  reference text,
  status text DEFAULT 'posted' NOT NULL CHECK (status IN ('draft', 'posted', 'void')),
  created_by uuid REFERENCES public.profiles(id),
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accounting can manage accounting_transactions" ON public.accounting_transactions;
CREATE POLICY "Accounting can manage accounting_transactions" ON public.accounting_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- journal_entries table used by engine.ts (separate from journal_entries in 014)
-- The engine uses a different table: journal_entries with account_id, debit, credit columns
-- We need to ensure the engine's journal_entries table exists
CREATE TABLE IF NOT EXISTS public.double_entry_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.accounting_transactions(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  account_code text NOT NULL,
  account_name text NOT NULL,
  debit numeric(14, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

ALTER TABLE public.double_entry_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accounting can manage double_entry_lines" ON public.double_entry_lines;
CREATE POLICY "Accounting can manage double_entry_lines" ON public.double_entry_lines
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- =========================================================
-- 12. FIX bank_accounts: add missing RLS SELECT policy
-- =========================================================

DROP POLICY IF EXISTS "Accounting can view bank accounts" ON public.bank_accounts;
CREATE POLICY "Accounting can view bank accounts" ON public.bank_accounts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- Finance categories table is ready. Add categories via the app.

-- =========================================================
-- 14. TRIGGER: auto-update bank balance when transaction recorded
-- =========================================================

-- Function to keep bank account balance in sync (optional enhancement)
-- This is a helper — actual balance updates happen via server actions
CREATE OR REPLACE FUNCTION public.update_fixed_asset_book_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_book_value := NEW.purchase_cost - NEW.accumulated_depreciation;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_asset_book_value ON public.fixed_assets;
CREATE TRIGGER trg_update_asset_book_value
  BEFORE INSERT OR UPDATE OF accumulated_depreciation, purchase_cost
  ON public.fixed_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fixed_asset_book_value();

-- =========================================================
-- 15. FUNCTION: get students with role for fee management
--     Used as fallback when profiles.role column doesn't exist
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_student_profiles()
RETURNS TABLE(id uuid, full_name text, email text) AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p.id AND r.name = 'student'
    )
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Budget periods table is ready. Create your financial year via the app.

-- =========================================================
-- 17. GRANT permissions for service role
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.double_entry_lines TO authenticated;
GRANT SELECT ON public.student_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_profiles() TO authenticated;
