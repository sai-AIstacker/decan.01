-- Migration 013: ERP Finance System

-- 1. Finance Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
    CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finance_category_type') THEN
    CREATE TYPE finance_category_type AS ENUM ('income', 'expense');
  END IF;
END
$$;

-- 2. Finance Tables
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type finance_category_type NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type transaction_type NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  entry_type ledger_entry_type NOT NULL,
  account_name text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  method payment_method NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Row Level Security
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view finance categories" ON public.finance_categories;
CREATE POLICY "Authenticated can view finance categories" ON public.finance_categories FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Accounting can modify finance categories" ON public.finance_categories;
CREATE POLICY "Accounting can modify finance categories" ON public.finance_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Accounting can update finance categories" ON public.finance_categories;
CREATE POLICY "Accounting can update finance categories" ON public.finance_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

DROP POLICY IF EXISTS "Accounting can view transactions" ON public.transactions;
CREATE POLICY "Accounting can view transactions" ON public.transactions FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.id = auth.uid())
);
DROP POLICY IF EXISTS "Accounting can insert transactions" ON public.transactions;
CREATE POLICY "Accounting can insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Accounting can update transactions" ON public.transactions;
CREATE POLICY "Accounting can update transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

DROP POLICY IF EXISTS "Accounting can view ledger entries" ON public.ledger_entries;
CREATE POLICY "Accounting can view ledger entries" ON public.ledger_entries FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting') OR
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.student_id = auth.uid())
);
DROP POLICY IF EXISTS "Accounting can insert ledger entries" ON public.ledger_entries;
CREATE POLICY "Accounting can insert ledger entries" ON public.ledger_entries FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

DROP POLICY IF EXISTS "Accounting can view expenses" ON public.expenses;
CREATE POLICY "Accounting can view expenses" ON public.expenses FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Accounting can insert expenses" ON public.expenses;
CREATE POLICY "Accounting can insert expenses" ON public.expenses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));
DROP POLICY IF EXISTS "Accounting can update expenses" ON public.expenses;
CREATE POLICY "Accounting can update expenses" ON public.expenses FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accounting'));

-- 4. Ledger automation functions
CREATE OR REPLACE FUNCTION public.insert_transaction_ledger_entries() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'income' THEN
    INSERT INTO public.ledger_entries (transaction_id, entry_type, account_name, amount, description)
    VALUES
      (NEW.id, 'debit', 'Cash / Bank', NEW.amount, NEW.description),
      (NEW.id, 'credit', COALESCE((SELECT name FROM public.finance_categories WHERE id = NEW.category_id), 'Revenue'), NEW.amount, NEW.description);
  ELSE
    INSERT INTO public.ledger_entries (transaction_id, entry_type, account_name, amount, description)
    VALUES
      (NEW.id, 'debit', COALESCE((SELECT name FROM public.finance_categories WHERE id = NEW.category_id), 'Expense'), NEW.amount, NEW.description),
      (NEW.id, 'credit', 'Cash / Bank', NEW.amount, NEW.description);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_transaction_entries
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.insert_transaction_ledger_entries();

CREATE OR REPLACE FUNCTION public.auto_create_transaction_from_payment() RETURNS TRIGGER AS $$
DECLARE
  student uuid;
  category uuid;
BEGIN
  SELECT student_id INTO student FROM public.invoices WHERE id = NEW.invoice_id;
  SELECT id INTO category FROM public.finance_categories WHERE type = 'income' ORDER BY name LIMIT 1;

  INSERT INTO public.transactions (type, amount, description, transaction_date, invoice_id, student_id, category_id)
  VALUES (
    'income',
    NEW.amount_paid,
    'Invoice payment ' || NEW.invoice_id,
    NEW.payment_date,
    NEW.invoice_id,
    student,
    category
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_create_transaction
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.auto_create_transaction_from_payment();

CREATE OR REPLACE FUNCTION public.auto_create_transaction_from_expense() RETURNS TRIGGER AS $$
DECLARE
  trans_id uuid;
BEGIN
  INSERT INTO public.transactions (type, amount, description, transaction_date, category_id)
  VALUES (
    'expense',
    NEW.amount,
    NEW.title,
    NEW.expense_date::timestamp with time zone,
    NEW.category_id
  ) RETURNING id INTO trans_id;

  UPDATE public.expenses SET transaction_id = trans_id WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_expense_create_transaction
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.auto_create_transaction_from_expense();

-- Finance categories table is ready. Add categories via the app.
