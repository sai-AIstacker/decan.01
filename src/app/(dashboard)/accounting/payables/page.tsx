import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendingDown, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function PayablesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, title, amount, method, expense_date, notes, category_id, finance_categories:category_id(name)")
    .order("expense_date", { ascending: false });

  const allExpenses = (expenses || []) as any[];

  const totalPayables = allExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  allExpenses.forEach((e) => {
    const cat = e.finance_categories?.name || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
  });
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  // Simple aging: treat expense_date as the "due" date 
  const now = new Date();
  const agingTotals = { "current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  allExpenses.forEach((e) => {
    const days = Math.floor((now.getTime() - new Date(e.expense_date).getTime()) / 86400000);
    if (days <= 7) agingTotals["current"] += Number(e.amount);
    else if (days <= 30) agingTotals["1-30"] += Number(e.amount);
    else if (days <= 60) agingTotals["31-60"] += Number(e.amount);
    else if (days <= 90) agingTotals["61-90"] += Number(e.amount);
    else agingTotals["90+"] += Number(e.amount);
  });

  const methodColors: Record<string, string> = {
    cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    card: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300",
    bank_transfer: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-zinc-300",
    online: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Payables</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          Accounts Payable
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track vendor bills and expense payables</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Payables", value: fmt(totalPayables), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
          { label: "This Month", value: fmt(allExpenses.filter((e) => e.expense_date >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10)).reduce((s, e) => s + Number(e.amount), 0)), color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200/60" },
          { label: "Categories", value: catEntries.length, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Total Entries", value: allExpenses.length, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/50", border: "border-slate-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Expense by Category</h2>
          <div className="space-y-3">
            {catEntries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No expense data yet</p>
            ) : catEntries.map(([cat, amt]) => {
              const pct = Math.round((amt / totalPayables) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(amt)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aging */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Payables Aging
          </h2>
          <div className="space-y-3">
            {Object.entries(agingTotals).map(([bucket, total]) => {
              const colors: Record<string, string> = { "current": "bg-emerald-500", "1-30": "bg-amber-400", "31-60": "bg-orange-500", "61-90": "bg-red-500", "90+": "bg-red-700" };
              const textColors: Record<string, string> = { "current": "text-emerald-600 dark:text-emerald-400", "1-30": "text-amber-600 dark:text-amber-400", "31-60": "text-orange-600 dark:text-orange-400", "61-90": "text-red-600 dark:text-red-400", "90+": "text-red-700 dark:text-red-300" };
              const max = Math.max(...Object.values(agingTotals)) || 1;
              return (
                <div key={bucket} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{bucket === "current" ? "Recent (≤7 days)" : `${bucket} days`}</span>
                    <span className={`font-semibold ${textColors[bucket]}`}>{fmt(total)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${colors[bucket]} transition-all`} style={{ width: `${Math.round((total / max) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">All Expenses</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{allExpenses.length} records</p>
          </div>
          <Link href="/accounting/expenses" className="text-xs text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 hover:underline">Add Expense →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Title", "Category", "Amount", "Method", "Date", "Notes"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allExpenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No expense records found</td></tr>
              ) : allExpenses.slice(0, 20).map((exp) => (
                <tr key={exp.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">{exp.title}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{exp.finance_categories?.name || "—"}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-rose-600 dark:text-rose-400">{fmt(Number(exp.amount))}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${methodColors[exp.method] || "bg-slate-100 text-slate-600"}`}>{exp.method?.replace("_", " ")}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">{exp.expense_date}</td>
                  <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{exp.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
