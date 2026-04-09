import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, ChevronRight, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Download } from "lucide-react";
import Link from "next/link";
import { generateIncomeStatement, generateBalanceSheet, getMonthlyTrend, getFeeCollectionSummary, getExpenseBreakdown, getCurrentFinancialYear } from "@/lib/accounting/reports";
import { BarChartWidget, PieChartWidget, LineChartWidget } from "@/components/ui/analytics-charts";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default async function AdvancedReportsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const fy = getCurrentFinancialYear();

  const [incomeStatement, balanceSheet, monthlyTrend, feeCollection, expenseBreakdown] = await Promise.all([
    generateIncomeStatement(fy),
    generateBalanceSheet(new Date()),
    getMonthlyTrend(fy),
    getFeeCollectionSummary(fy),
    getExpenseBreakdown(fy),
  ]);

  const revenueExpenseData = monthlyTrend.map((m) => ({
    name: m.month,
    Revenue: Math.round(m.revenue),
    Expenses: Math.round(m.expenses),
  }));

  const expensePieData = expenseBreakdown.slice(0, 6).map((e) => ({
    name: e.name,
    value: Math.round(e.amount),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Advanced Reports</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              Advanced Reports
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Comprehensive financial analysis for {fy.label}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30 border border-zinc-200/60 dark:border-indigo-800/40">
            <Calendar className="w-4 h-4 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300" />
            <span className="text-sm font-medium text-indigo-700 dark:text-zinc-300">{fy.label}</span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: fmt(incomeStatement.totalRevenue), sub: fy.label, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60", icon: TrendingUp },
          { label: "Total Expenses", value: fmt(incomeStatement.totalExpenses), sub: fy.label, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60", icon: TrendingDown },
          { label: "Net Surplus", value: fmt(incomeStatement.netProfit), sub: `${fmtPct(incomeStatement.profitMargin)} margin`, color: incomeStatement.netProfit >= 0 ? "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300" : "text-red-600", bg: "bg-zinc-100 dark:bg-blue-950/30", border: "border-zinc-200/60", icon: DollarSign },
          { label: "Fee Collection", value: fmtPct(feeCollection.collectionRate), sub: `${fmt(feeCollection.totalCollected)} collected`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200/60", icon: Users },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${kpi.color}`} />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{kpi.label}</p>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Monthly Revenue vs Expenses</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{fy.label} trend analysis</p>
          </div>
        </div>
        <div className="h-72">
          {revenueExpenseData.length > 0 ? (
            <BarChartWidget data={revenueExpenseData} xKey="name" yKey="Revenue" fillColor="#6366f1" />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data for this period</div>
          )}
        </div>
      </div>

      {/* Income Statement + Expense Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Statement */}
        <div className="apple-card overflow-hidden">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Income Statement (P&L)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{fy.label}</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Revenue */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Revenue</p>
              {incomeStatement.revenue.map((item) => (
                <div key={item.accountCode} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{item.accountName}</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">{fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 mt-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Total Revenue</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(incomeStatement.totalRevenue)}</span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expenses</p>
              {incomeStatement.expenses.slice(0, 8).map((item, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{item.accountName}</span>
                  <span className="font-medium text-rose-700 dark:text-rose-300">{fmt(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 mt-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Total Expenses</span>
                <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{fmt(incomeStatement.totalExpenses)}</span>
              </div>
            </div>

            {/* Net */}
            <div className={`rounded-2xl p-4 ${incomeStatement.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40" : "bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40"}`}>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Net Surplus / (Deficit)</span>
                <span className={`font-bold text-lg ${incomeStatement.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                  {incomeStatement.netProfit >= 0 ? "" : "("}{fmt(Math.abs(incomeStatement.netProfit))}{incomeStatement.netProfit < 0 ? ")" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Profit Margin: {fmtPct(incomeStatement.profitMargin)}
              </p>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="apple-card overflow-hidden">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Expense Breakdown</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">By category</p>
          </div>
          <div className="p-6">
            {expensePieData.length > 0 ? (
              <>
                <div className="h-48 mb-4">
                  <PieChartWidget data={expensePieData} colors={["#f43f5e", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"]} />
                </div>
                <div className="space-y-2">
                  {expenseBreakdown.slice(0, 8).map((e, i) => {
                    const total = incomeStatement.totalExpenses || 1;
                    const pct = Math.round((e.amount / total) * 100);
                    const colors = ["bg-rose-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-zinc-900 dark:bg-zinc-100", "bg-violet-500", "bg-pink-500", "bg-cyan-500"];
                    return (
                      <div key={e.name} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 dark:text-slate-300 truncate">{e.name}</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100 ml-2">{fmt(e.amount)}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1">
                            <div className={`h-1 rounded-full ${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expense data</div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Balance Sheet Summary</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">As of today</p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${balanceSheet.isBalanced ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
            {balanceSheet.isBalanced ? "✓ Balanced" : "⚠ Unbalanced"}
          </span>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Assets */}
          <div className="p-6">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">Assets</p>
            {balanceSheet.assets.current.map((item) => (
              <div key={item.accountCode} className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-600 dark:text-slate-400 truncate">{item.accountName}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 ml-2">{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Assets</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(balanceSheet.assets.total)}</span>
            </div>
          </div>

          {/* Liabilities */}
          <div className="p-6">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3">Liabilities</p>
            {balanceSheet.liabilities.current.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No liabilities recorded</p>
            ) : (
              balanceSheet.liabilities.current.map((item) => (
                <div key={item.accountCode} className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-600 dark:text-slate-400 truncate">{item.accountName}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 ml-2">{fmt(item.amount)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Liabilities</span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{fmt(balanceSheet.liabilities.total)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="p-6">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Equity</p>
            {balanceSheet.equity.items.map((item) => (
              <div key={item.accountCode} className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-600 dark:text-slate-400 truncate">{item.accountName}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 ml-2">{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Total Equity</span>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{fmt(balanceSheet.equity.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Collection Report */}
      <div className="apple-card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" /> Fee Collection Report — {fy.label}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Total Billed", value: fmt(feeCollection.totalBilled), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300" },
            { label: "Collected", value: fmt(feeCollection.totalCollected), color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pending", value: fmt(feeCollection.totalPending), color: "text-amber-600 dark:text-amber-400" },
            { label: "Overdue", value: fmt(feeCollection.totalOverdue), color: "text-rose-600 dark:text-rose-400" },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">Collection Rate</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtPct(feeCollection.collectionRate)}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${Math.min(100, feeCollection.collectionRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{feeCollection.invoiceCount.paid} paid / {feeCollection.invoiceCount.total} total invoices</span>
            <span>{feeCollection.invoiceCount.overdue} overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
