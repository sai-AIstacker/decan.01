import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Target, ChevronRight, TrendingDown, TrendingUp, AlertTriangle, Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { CreateBudgetPeriodForm } from "./ui/create-budget-period-form";
import { CreateBudgetItemForm } from "./ui/create-budget-item-form";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function BudgetsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [
    { data: budgetPeriods, error: periodError },
    { data: budgetItems, error: itemError },
    { data: expenses },
    { data: categories },
    { data: costCenters },
  ] = await Promise.all([
    supabase.from("budget_periods").select("*").order("start_date", { ascending: false }),
    supabase
      .from("budget_items")
      .select("*, cost_centers(name), finance_categories(name)")
      .order("name"),
    supabase.from("expenses").select("amount, category_id, expense_date"),
    supabase.from("finance_categories").select("id, name").eq("type", "expense"),
    supabase.from("cost_centers").select("id, name").eq("is_active", true),
  ]);

  if (periodError || itemError) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            Budgets & Planning
          </h1>
          <CreateBudgetPeriodForm />
        </div>
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-8 text-center">
          <p className="text-orange-700 dark:text-orange-300 font-medium">Budget tables not yet available</p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Run migration 014 in your Supabase dashboard to enable budgeting.
          </p>
        </div>
      </div>
    );
  }

  const allPeriods = (budgetPeriods || []) as any[];
  const activePeriod = allPeriods.find((p) => p.is_active) || allPeriods[0];

  // Compute actual spend per category for active period
  const actualByCategory: Record<string, number> = {};
  const periodExpenses = activePeriod
    ? (expenses || []).filter((e) => {
        const d = e.expense_date;
        return d >= activePeriod.start_date && d <= activePeriod.end_date;
      })
    : expenses || [];

  periodExpenses.forEach((e) => {
    if (e.category_id) {
      actualByCategory[e.category_id] = (actualByCategory[e.category_id] || 0) + Number(e.amount);
    }
  });

  // Filter budget items for active period
  const periodItems = activePeriod
    ? (budgetItems || []).filter((b: any) => b.budget_period_id === activePeriod.id)
    : budgetItems || [];

  const totalBudgeted = periodItems.reduce((s: number, b: any) => s + Number(b.budgeted_amount), 0);

  const enriched = periodItems.map((item: any) => {
    const actual = item.category_id ? (actualByCategory[item.category_id] || 0) : 0;
    const variance = Number(item.budgeted_amount) - actual;
    const pct = Number(item.budgeted_amount) > 0 ? Math.min(100, Math.round((actual / Number(item.budgeted_amount)) * 100)) : 0;
    return { ...item, actual, variance, pct };
  });

  const totalActual = enriched.reduce((s: number, e: any) => s + e.actual, 0);
  const overBudgetItems = enriched.filter((e: any) => e.variance < 0);
  const utilizationPct = totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Budgets</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              Budgets & Planning
            </h1>
            {activePeriod && (
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Active: <span className="font-semibold text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{activePeriod.name}</span>
                {" "}({activePeriod.start_date} → {activePeriod.end_date})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {activePeriod && (
              <CreateBudgetItemForm
                periodId={activePeriod.id}
                categories={categories || []}
                costCenters={costCenters || []}
              />
            )}
            <CreateBudgetPeriodForm />
          </div>
        </div>
      </div>

      {/* Budget Periods */}
      {allPeriods.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {allPeriods.map((period: any) => (
            <div
              key={period.id}
              className={`flex-shrink-0 rounded-2xl border p-4 min-w-[200px] ${
                period.is_active
                  ? "border-indigo-300 dark:border-indigo-700 bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{period.name}</span>
                {period.is_active && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#1d1d1f] text-white text-xs font-medium">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{period.start_date} → {period.end_date}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Budgeted", value: fmt(totalBudgeted), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Actual Spend", value: fmt(totalActual), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
          { label: "Remaining", value: fmt(Math.max(0, totalBudgeted - totalActual)), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Over Budget", value: overBudgetItems.length, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Overall Utilization */}
      {totalBudgeted > 0 && (
        <div className="apple-card p-6">
          <div className="flex justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Overall Budget Utilization</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {utilizationPct >= 90 ? "⚠️ Near limit" : utilizationPct >= 100 ? "🚨 Over budget" : "✅ On track"}
              </p>
            </div>
            <span className={`text-2xl font-bold ${utilizationPct >= 100 ? "text-rose-600" : utilizationPct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
              {utilizationPct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-700 ${
                utilizationPct >= 100 ? "bg-rose-500" : utilizationPct >= 80 ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"
              }`}
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Spent: {fmt(totalActual)}</span>
            <span>Budget: {fmt(totalBudgeted)}</span>
          </div>
        </div>
      )}

      {/* Budget Items */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Budget vs Actual</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Department-level spending breakdown</p>
        </div>

        {enriched.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No budget items yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
              {activePeriod ? "Add budget items using the button above." : "Create a budget period first."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {enriched.map((item: any) => (
              <div key={item.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.cost_centers?.name || item.finance_categories?.name || "General"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.variance < 0 ? (
                      <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Over by {fmt(Math.abs(item.variance))}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Under by {fmt(item.variance)}
                      </span>
                    )}
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {fmt(item.actual)} / {fmt(Number(item.budgeted_amount))}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${
                      item.pct >= 100 ? "bg-rose-500" : item.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.pct}% utilized</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
