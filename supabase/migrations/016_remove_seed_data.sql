-- Migration 016: Remove All Fake Seed Data
-- Deletes every row that was auto-inserted by migrations 013, 014, 015.
-- After this runs, the accounting module shows empty states until the
-- actual school admin enters their real data.

-- =========================================================
-- 1. Remove fake bank accounts (inserted by migration 014)
-- =========================================================
DELETE FROM public.bank_accounts
WHERE account_number IN ('XXXXXXXXXX001', 'XXXXXXXXXX002')
   OR (name = 'Petty Cash' AND bank_name = 'Cash' AND opening_balance = 10000.00);

-- =========================================================
-- 2. Remove fake fixed assets (inserted by migration 014)
-- =========================================================
DELETE FROM public.fixed_assets
WHERE asset_code IN ('FA-001', 'FA-002', 'FA-003', 'FA-004', 'FA-005');

-- =========================================================
-- 3. Remove fake scholarships (inserted by migration 014)
-- =========================================================
DELETE FROM public.scholarships
WHERE name IN (
  'Merit Scholarship',
  'Need Based Aid',
  'Sports Excellence',
  'Sibling Discount'
);

-- =========================================================
-- 4. Remove fake cost centers (inserted by migration 014)
-- =========================================================
DELETE FROM public.cost_centers
WHERE code IN ('CC-ADM', 'CC-ACD', 'CC-HR', 'CC-IT', 'CC-SPT', 'CC-LIB', 'CC-TRP');

-- =========================================================
-- 5. Remove fake chart of accounts (inserted by migration 014)
--    These are system accounts with is_system = true.
--    We keep the TABLE but clear the seeded rows.
--    The user will build their own CoA.
-- =========================================================
DELETE FROM public.chart_of_accounts WHERE is_system = true;

-- =========================================================
-- 6. Remove fake finance categories (inserted by 013 + 015)
-- =========================================================
DELETE FROM public.finance_categories
WHERE name IN (
  'Tuition', 'Donations', 'Admission', 'Supplies', 'Payroll', 'Utilities', 'Maintenance',
  'Tuition Fee', 'Admission Fee', 'Examination Fee', 'Library Fee', 'Sports Fee',
  'Transport Fee', 'Donation', 'Grant', 'Other Income',
  'Staff Salaries', 'Utilities (Electricity/Water)', 'Maintenance & Repairs',
  'Stationery & Supplies', 'Lab Consumables', 'Sports Equipment', 'Library Books',
  'Marketing & Advertising', 'Transport & Fuel', 'IT & Software',
  'Cleaning & Housekeeping', 'Security Services', 'Professional Development',
  'Bank Charges', 'Miscellaneous Expense'
);

-- =========================================================
-- 7. Remove fake budget periods (inserted by 014 + 015)
-- =========================================================
DELETE FROM public.budget_periods WHERE name = 'FY 2025-26';

-- =========================================================
-- 8. Remove any fake transactions/invoices from demo seed
--    (migration 009 has generate_finance_demo_data() function
--     which may have been called — clean those up too)
-- =========================================================
-- Only delete invoices that have placeholder/demo titles
DELETE FROM public.payments
WHERE invoice_id IN (
  SELECT id FROM public.invoices WHERE title = 'Term 1 Tuition Fee'
);
DELETE FROM public.invoices WHERE title = 'Term 1 Tuition Fee';

-- Clean up any transactions auto-created from the above
DELETE FROM public.transactions
WHERE description LIKE 'Invoice payment %'
  AND created_at < now() - interval '0 seconds'
  AND student_id IS NULL;
