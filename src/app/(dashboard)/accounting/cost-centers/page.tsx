import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Layers, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { PieChartWidget } from "@/components/ui/analytics-charts";
import { CreateCostCenterForm } from "./ui/create-cost-center-form";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DEPT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16"];

export default async function CostCentersPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: costCenters, error }, { data: expenses }] = await Promise.all([
    supabase.from("cost_centers").select("*, cost_allocations(amount)").eq("is_active", true),
    supabase.from("expenses").select("amount, category_id, finance_categories:category_id(name)"),
  ]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          Cost Centers
        </h1>
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-8 text-center">
          <p className="text-orange-700 dark:text-orange-300 font-medium">Cost Centers table not yet available</p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Run migration 014 in your Supabase dashboard to enable cost centers.</p>
        </div>
      </div>
    );
  }

  const centers = (costCenters || []) as any[];
  const allExpenses = (expenses || []) as any[];

  // Compute total allocated per cost center
  const enriched = centers.map((cc: any) => {
    const allocated = (cc.cost_allocations || []).reduce((s: number, a: any) => s + Number(a.amount), 0);
    return { ...cc, allocated };
  });

  const totalAllocated = enriched.reduce((s, cc) => s + cc.allocated, 0);
  const totalExpenses = allExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const pieData = enriched
    .filter((cc) => cc.allocated > 0)
    .map((cc) => ({ name: cc.name, value: cc.allocated }));

  // Category summary
  const catSummary: Record<string, number> = {};
  allExpenses.forEach((e: any) => {
    const cat = (e.finance_categories as any)?.name || "Uncategorized";
    catSummary[cat] = (catSummary[cat] || 0) + Number(e.amount);
  });
  const catEntries = Object.entries(catSummary).sort((a, b) => b[1] - a[1]).slice(0, 7);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Cost Centers</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Layers className="w-5 h-5 text-white" />
              </div>
              Cost Centers
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Allocate and track expenses by department</p>
          </div>
          <CreateCostCenterForm costCenters={centers} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Departments", value: centers.length, color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30", border: "border-fuchsia-200/60" },
          { label: "Total Allocated", value: fmt(totalAllocated), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Total Expenses", value: fmt(totalExpenses), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Spending by Department</h2>
          <div className="h-72">
            {pieData.length > 0 ? (
              <PieChartWidget data={pieData} colors={DEPT_COLORS} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm flex-col gap-2">
                <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <p>No allocations recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Top Expense Categories</h2>
          <div className="space-y-3">
            {catEntries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No expense data yet</p>
            ) : catEntries.map(([cat, amt], i) => {
              const pct = Math.round((amt / totalExpenses) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(amt)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Department Cost Centers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Code", "Department", "Name", "Allocated Amount", "% of Total"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No cost centers found</td></tr>
              ) : enriched.map((cc: any, i: number) => {
                const pct = totalAllocated > 0 ? Math.round((cc.allocated / totalAllocated) * 100) : 0;
                return (
                  <tr key={cc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-fuchsia-600 dark:text-fuchsia-400">{cc.code}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{cc.department || "—"}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">{cc.name}</td>
                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: DEPT_COLORS[i % DEPT_COLORS.length] }}>{fmt(cc.allocated)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 w-16">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
