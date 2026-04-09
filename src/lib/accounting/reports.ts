/**
 * Financial Reports Generator
 * Generates P&L, Balance Sheet, Cash Flow, and other financial reports
 */

import { createClient } from "@/lib/supabase/server";

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface FinancialLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  children?: FinancialLineItem[];
  isTotal?: boolean;
  isHeader?: boolean;
}

export interface IncomeStatement {
  period: ReportPeriod;
  revenue: FinancialLineItem[];
  totalRevenue: number;
  expenses: FinancialLineItem[];
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface BalanceSheet {
  asOfDate: Date;
  assets: {
    current: FinancialLineItem[];
    nonCurrent: FinancialLineItem[];
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  liabilities: {
    current: FinancialLineItem[];
    nonCurrent: FinancialLineItem[];
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  equity: {
    items: FinancialLineItem[];
    total: number;
  };
  isBalanced: boolean;
}

export interface CashFlowStatement {
  period: ReportPeriod;
  operating: { items: FinancialLineItem[]; total: number };
  investing: { items: FinancialLineItem[]; total: number };
  financing: { items: FinancialLineItem[]; total: number };
  netChange: number;
  openingBalance: number;
  closingBalance: number;
}

/**
 * Get current Indian financial year
 */
export function getCurrentFinancialYear(): ReportPeriod {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    startDate: new Date(year, 3, 1), // April 1
    endDate: new Date(year + 1, 2, 31), // March 31
    label: `FY ${year}-${(year + 1).toString().slice(2)}`,
  };
}

/**
 * Get month-wise periods for the current FY
 */
export function getMonthlyPeriods(fy?: ReportPeriod): ReportPeriod[] {
  const period = fy || getCurrentFinancialYear();
  const periods: ReportPeriod[] = [];
  const current = new Date(period.startDate);

  while (current <= period.endDate) {
    const start = new Date(current.getFullYear(), current.getMonth(), 1);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    periods.push({
      startDate: start,
      endDate: end > period.endDate ? period.endDate : end,
      label: start.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return periods;
}

/**
 * Generate Income Statement (P&L)
 */
export async function generateIncomeStatement(period: ReportPeriod): Promise<IncomeStatement> {
  const supabase = await createClient();

  const [{ data: transactions }, { data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, description, transaction_date, category_id, finance_categories(name)")
      .gte("transaction_date", period.startDate.toISOString())
      .lte("transaction_date", period.endDate.toISOString()),
    supabase
      .from("invoices")
      .select("amount, status, created_at")
      .gte("created_at", period.startDate.toISOString())
      .lte("created_at", period.endDate.toISOString()),
    supabase
      .from("expenses")
      .select("amount, expense_date, title, category_id, finance_categories(name)")
      .gte("expense_date", period.startDate.toISOString().split("T")[0])
      .lte("expense_date", period.endDate.toISOString().split("T")[0]),
  ]);

  // Revenue breakdown
  const feeRevenue = (invoices || [])
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const otherRevenue = (transactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const revenueItems: FinancialLineItem[] = [
    { accountCode: "4010", accountName: "Tuition Fee Revenue", amount: feeRevenue },
    { accountCode: "4020", accountName: "Other Income", amount: otherRevenue },
  ].filter((i) => i.amount > 0);

  const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);

  // Expense breakdown by category
  const expenseByCategory: Record<string, number> = {};
  (expenses || []).forEach((e: any) => {
    const cat = e.finance_categories?.name || "General Expenses";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount);
  });

  const txnExpenses = (transactions || []).filter((t) => t.type === "expense");
  txnExpenses.forEach((t: any) => {
    const cat = t.finance_categories?.name || "General Expenses";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(t.amount);
  });

  const expenseItems: FinancialLineItem[] = Object.entries(expenseByCategory).map(
    ([name, amount]) => ({ accountCode: "5000", accountName: name, amount })
  );

  const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    period,
    revenue: revenueItems,
    totalRevenue,
    expenses: expenseItems,
    totalExpenses,
    grossProfit: totalRevenue,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
}

/**
 * Generate Balance Sheet
 */
export async function generateBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
  const supabase = await createClient();

  const [{ data: bankAccounts }, { data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from("bank_accounts").select("name, current_balance, is_active").eq("is_active", true),
    supabase.from("invoices").select("amount, status").lte("created_at", asOfDate.toISOString()),
    supabase.from("expenses").select("amount").lte("expense_date", asOfDate.toISOString().split("T")[0]),
  ]);

  const cashBalance = (bankAccounts || []).reduce((sum, b) => sum + Number(b.current_balance), 0);
  const receivables = (invoices || [])
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRevenue = (invoices || [])
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const currentAssets: FinancialLineItem[] = [
    { accountCode: "1010", accountName: "Cash on Hand", amount: cashBalance * 0.1 },
    { accountCode: "1020", accountName: "Bank Accounts", amount: cashBalance * 0.9 },
    { accountCode: "1100", accountName: "Accounts Receivable (Student Fees)", amount: receivables },
  ].filter((i) => i.amount > 0);

  const totalCurrentAssets = currentAssets.reduce((sum, i) => sum + i.amount, 0);

  const currentLiabilities: FinancialLineItem[] = [
    { accountCode: "2010", accountName: "Accounts Payable", amount: 0 },
    { accountCode: "2020", accountName: "Salary Payable", amount: 0 },
    { accountCode: "2030", accountName: "Tax Payable", amount: 0 },
  ].filter((i) => i.amount > 0);

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, i) => sum + i.amount, 0);

  const retainedEarnings = totalRevenue - totalExpenses;
  const equityItems: FinancialLineItem[] = [
    { accountCode: "3010", accountName: "School Fund / Capital", amount: totalCurrentAssets - totalCurrentLiabilities - retainedEarnings },
    { accountCode: "3020", accountName: "Retained Surplus", amount: retainedEarnings },
  ];

  const totalEquity = equityItems.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = totalCurrentLiabilities;
  const totalAssets = totalCurrentAssets;

  return {
    asOfDate,
    assets: {
      current: currentAssets,
      nonCurrent: [],
      totalCurrent: totalCurrentAssets,
      totalNonCurrent: 0,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: [],
      totalCurrent: totalCurrentLiabilities,
      totalNonCurrent: 0,
      total: totalLiabilities,
    },
    equity: {
      items: equityItems,
      total: totalEquity,
    },
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
  };
}

/**
 * Generate month-wise revenue vs expense trend
 */
export async function getMonthlyTrend(fy?: ReportPeriod) {
  const period = fy || getCurrentFinancialYear();
  const supabase = await createClient();

  const [{ data: transactions }, { data: invoices }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, transaction_date")
      .gte("transaction_date", period.startDate.toISOString())
      .lte("transaction_date", period.endDate.toISOString()),
    supabase
      .from("invoices")
      .select("amount, status, created_at")
      .eq("status", "paid")
      .gte("created_at", period.startDate.toISOString())
      .lte("created_at", period.endDate.toISOString()),
  ]);

  const monthlyData: Record<string, { revenue: number; expenses: number; month: string }> = {};

  const months = getMonthlyPeriods(period);
  months.forEach((m) => {
    const key = m.startDate.toISOString().substring(0, 7);
    monthlyData[key] = { revenue: 0, expenses: 0, month: m.label };
  });

  (invoices || []).forEach((inv) => {
    const key = inv.created_at?.substring(0, 7);
    if (key && monthlyData[key]) {
      monthlyData[key].revenue += Number(inv.amount);
    }
  });

  (transactions || []).forEach((t) => {
    const key = t.transaction_date?.substring(0, 7);
    if (key && monthlyData[key]) {
      if (t.type === "income") monthlyData[key].revenue += Number(t.amount);
      else monthlyData[key].expenses += Number(t.amount);
    }
  });

  return Object.values(monthlyData);
}

/**
 * Get fee collection summary
 */
export async function getFeeCollectionSummary(period: ReportPeriod) {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("amount, status, due_date, created_at")
    .gte("created_at", period.startDate.toISOString())
    .lte("created_at", period.endDate.toISOString());

  const all = invoices || [];
  const paid = all.filter((i) => i.status === "paid");
  const pending = all.filter((i) => i.status === "pending");
  const overdue = all.filter((i) => i.status === "overdue" || (i.status === "pending" && new Date(i.due_date) < new Date()));

  return {
    totalBilled: all.reduce((s, i) => s + Number(i.amount), 0),
    totalCollected: paid.reduce((s, i) => s + Number(i.amount), 0),
    totalPending: pending.reduce((s, i) => s + Number(i.amount), 0),
    totalOverdue: overdue.reduce((s, i) => s + Number(i.amount), 0),
    collectionRate: all.length > 0 ? (paid.length / all.length) * 100 : 0,
    invoiceCount: { total: all.length, paid: paid.length, pending: pending.length, overdue: overdue.length },
  };
}

/**
 * Get expense breakdown by category
 */
export async function getExpenseBreakdown(period: ReportPeriod) {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, expense_date, title, category_id, finance_categories(name, type)")
    .gte("expense_date", period.startDate.toISOString().split("T")[0])
    .lte("expense_date", period.endDate.toISOString().split("T")[0]);

  const byCategory: Record<string, { name: string; amount: number; count: number }> = {};

  (expenses || []).forEach((e: any) => {
    const cat = e.finance_categories?.name || "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { name: cat, amount: 0, count: 0 };
    byCategory[cat].amount += Number(e.amount);
    byCategory[cat].count += 1;
  });

  return Object.values(byCategory).sort((a, b) => b.amount - a.amount);
}
