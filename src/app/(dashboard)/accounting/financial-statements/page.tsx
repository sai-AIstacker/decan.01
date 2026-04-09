import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Scale, ChevronRight, TrendingUp, TrendingDown, Activity, ArrowUpDown } from "lucide-react";
import Link from "next/link";

const fmt = (v: number) =>
  `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function FinancialStatementsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 3, 1); // April 1 (Indian FY)
  if (startOfYear > now) startOfYear.setFullYear(startOfYear.getFullYear() - 1);
  const startStr = startOfYear.toISOString();

  const [{ data: transactions }, { data: invoices }, { data: bankAccounts }] = await Promise.all([
    supabase.from("transactions").select("type, amount, transaction_date").gte("transaction_date", startStr),
    supabase.from("invoices").select("amount, status"),
    supabase.from("bank_accounts").select("name, current_balance, is_active").eq("is_active", true),
  ]);

  // === INCOME STATEMENT ===
  let totalRevenue = 0, totalExpenses = 0;
  const revByMonth: Record<string, number> = {};
  const expByMonth: Record<string, number> = {};

  (transactions || []).forEach((t) => {
    const amt = Number(t.amount);
    const month = t.transaction_date?.substring(0, 7) || "Unknown";
    if (t.type === "income") { totalRevenue += amt; revByMonth[month] = (revByMonth[month] || 0) + amt; }
    else { totalExpenses += amt; expByMonth[month] = (expByMonth[month] || 0) + amt; }
  });
  const netProfit = totalRevenue - totalExpenses;

  // === BALANCE SHEET ===
  const totalReceivables = (invoices || []).filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
  const cashTotal = (bankAccounts || []).reduce((s, b) => s + Number(b.current_balance), 0);
  const totalAssets = cashTotal + totalReceivables;
  const totalLiabilities = 0; // placeholder — no payables table yet
  const equity = totalAssets - totalLiabilities;

  // === TRIAL BALANCE ===
  // Build from transactions — debit = expense (cash out), credit = income (cash in)
  const trialEntries = [
    { account: "Cash & Bank", debit: 0, credit: cashTotal },
    { account: "Accounts Receivable", debit: totalReceivables, credit: 0 },
    { account: "Revenue / Income", debit: 0, credit: totalRevenue },
    { account: "Expenses", debit: totalExpenses, credit: 0 },
    { account: "Retained Earnings", debit: 0, credit: equity },
  ];
  const totalDebits = trialEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredits = trialEntries.reduce((s, e) => s + e.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Financial Statements</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <Scale className="w-5 h-5 text-white" />
          </div>
          Financial Statements
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">FY {startOfYear.getFullYear()}–{startOfYear.getFullYear() + 1} · Updated live</p>
      </div>

      {/* 3 Statement Cards */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Income Statement */}
        <div className="apple-card overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5" />
              <h2 className="font-semibold">Income Statement</h2>
            </div>
            <p className="text-emerald-100 text-xs">Profit & Loss — Current FY</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">({fmt(totalExpenses)})</span>
            </div>
            <div className="flex justify-between items-center py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3">
              <span className="font-bold text-slate-900 dark:text-slate-100">Net Profit / (Loss)</span>
              <span className={`font-bold text-lg ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                {netProfit < 0 ? `(${fmt(netProfit)})` : fmt(netProfit)}
              </span>
            </div>
            <div className="pt-2 space-y-1">
              {Object.keys(revByMonth).sort().slice(-4).map((m) => (
                <div key={m} className="flex justify-between text-xs">
                  <span className="text-slate-500">{m}</span>
                  <span className="text-slate-700 dark:text-slate-300">Rev: {fmt(revByMonth[m] || 0)} / Exp: {fmt(expByMonth[m] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Balance Sheet */}
        <div className="apple-card overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5" />
              <h2 className="font-semibold">Balance Sheet</h2>
            </div>
            <p className="text-blue-100 text-xs">Assets = Liabilities + Equity</p>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assets</p>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Cash & Bank</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{fmt(cashTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">Accounts Receivable</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{fmt(totalReceivables)}</span>
            </div>
            <div className="flex justify-between items-center py-2 rounded-xl bg-zinc-100 dark:bg-blue-900/20 px-3">
              <span className="font-semibold text-blue-900 dark:text-blue-200">Total Assets</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{fmt(totalAssets)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Equity & Liabilities</p>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400">School Equity</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{fmt(equity)}</span>
              </div>
              <div className="flex justify-between items-center py-2 rounded-xl bg-zinc-100 dark:bg-blue-900/20 px-3 mt-2">
                <span className="font-semibold text-blue-900 dark:text-blue-200">Total Eq. + Liab.</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{fmt(equity)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Balance */}
        <div className="apple-card overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className="w-5 h-5" />
              <h2 className="font-semibold">Trial Balance</h2>
            </div>
            <p className="text-violet-100 text-xs">Verify double-entry bookkeeping</p>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 text-xs text-slate-500 uppercase">Account</th>
                    <th className="text-right py-2 text-xs text-slate-500 uppercase">Dr</th>
                    <th className="text-right py-2 text-xs text-slate-500 uppercase">Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {trialEntries.map((e) => (
                    <tr key={e.account} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 text-slate-700 dark:text-slate-300 text-xs">{e.account}</td>
                      <td className="text-right py-1.5 text-xs text-slate-900 dark:text-slate-100">{e.debit > 0 ? fmt(e.debit) : "—"}</td>
                      <td className="text-right py-1.5 text-xs text-slate-900 dark:text-slate-100">{e.credit > 0 ? fmt(e.credit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <td className="py-2 font-semibold text-xs text-slate-700 dark:text-slate-300">TOTAL</td>
                    <td className="text-right py-2 font-bold text-xs text-slate-900 dark:text-slate-100">{fmt(totalDebits)}</td>
                    <td className="text-right py-2 font-bold text-xs text-slate-900 dark:text-slate-100">{fmt(totalCredits)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={`mt-4 rounded-xl p-3 text-center text-sm font-semibold ${isBalanced ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"}`}>
              {isBalanced ? "✓ Accounts are balanced" : "⚠ Out of balance — review needed"}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
