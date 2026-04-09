import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight, CheckCircle2, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { CreateBankAccountForm } from "./ui/create-bank-account-form";
import { CreateReconciliationForm } from "./ui/create-reconciliation-form";
import { UpdateBalanceButton } from "./ui/update-balance-button";

const fmt = (v: number) =>
  `₹${Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function BankPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [
    { data: bankAccounts, error: bankError },
    { data: transactions },
    { data: reconciliations, error: reconError },
  ] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("is_active", true).order("name"),
    supabase
      .from("transactions")
      .select("type, amount, transaction_date, description")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase
      .from("bank_reconciliations")
      .select("*, bank_accounts(name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalCash = (bankAccounts || []).reduce((s, b) => s + Number(b.current_balance), 0);

  // Cash flow analysis (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = (transactions || []).filter((t) => new Date(t.transaction_date) >= thirtyDaysAgo);
  const inflow30 = recent.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const outflow30 = recent.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // 7-day forecast
  const last7 = (transactions || []).filter((t) => {
    const days = Math.floor((Date.now() - new Date(t.transaction_date).getTime()) / 86400000);
    return days <= 7;
  });
  const avgDailyInflow = last7.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) / 7;
  const avgDailyOutflow = last7.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) / 7;

  const forecastDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      day: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      projected: totalCash + avgDailyInflow * (i + 1) - avgDailyOutflow * (i + 1),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Bank & Cash</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              Bank & Cash Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Multi-bank overview, reconciliation, and cash flow forecast</p>
          </div>
          <div className="flex gap-2">
            {!bankError && (bankAccounts || []).length > 0 && (
              <CreateReconciliationForm bankAccounts={bankAccounts || []} />
            )}
            <CreateBankAccountForm />
          </div>
        </div>
      </div>

      {/* Total Cash */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-amber-100 text-sm font-medium">Total Cash Position</p>
            <p className="text-5xl font-bold mt-1">{fmt(totalCash)}</p>
            <p className="text-amber-200 text-sm mt-2">Across {(bankAccounts || []).length} active accounts</p>
          </div>
          <div className="text-right">
            <div className="apple-card p-4">
              <p className="text-amber-100 text-xs mb-1">30-Day Net Flow</p>
              <p className={`text-xl font-bold ${inflow30 - outflow30 >= 0 ? "text-white" : "text-rose-200"}`}>
                {inflow30 - outflow30 >= 0 ? "+" : ""}{fmt(inflow30 - outflow30)}
              </p>
              <div className="flex gap-3 mt-2 text-xs text-amber-200">
                <span>↑ {fmt(inflow30)}</span>
                <span>↓ {fmt(outflow30)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Accounts */}
      {bankError ? (
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 p-8 text-center">
          <p className="text-orange-700 font-medium">Bank accounts table not found</p>
          <p className="text-sm text-orange-600 mt-1">Run migration 014 in your Supabase dashboard.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(bankAccounts || []).length === 0 ? (
            <div className="col-span-3 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No bank accounts yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Add your first bank account using the button above.</p>
            </div>
          ) : (
            (bankAccounts || []).map((acct: any) => {
              const netChange = Number(acct.current_balance) - Number(acct.opening_balance);
              return (
                <div key={acct.id} className="apple-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{acct.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{acct.bank_name}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium capitalize">
                      {acct.account_type}
                    </span>
                  </div>
                  {acct.account_number && (
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-3">
                      Acct: •••• {acct.account_number.slice(-4)}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Current Balance</span>
                      <span className="font-bold text-xl text-slate-900 dark:text-slate-100">{fmt(Number(acct.current_balance))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Opening Balance</span>
                      <span className="text-slate-600 dark:text-slate-300">{fmt(Number(acct.opening_balance))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Net Change</span>
                      <span className={netChange >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 font-medium"}>
                        {netChange >= 0 ? "+" : ""}{fmt(netChange)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <UpdateBalanceButton accountId={acct.id} accountName={acct.name} currentBalance={Number(acct.current_balance)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Cash Flow Forecast */}
      <div className="apple-card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">7-Day Cash Flow Forecast</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Projected based on last 7 days activity trends</p>
        <div className="grid grid-cols-7 gap-2">
          {forecastDays.map((d, i) => {
            const isPositive = d.projected >= totalCash;
            return (
              <div key={i} className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{d.day}</p>
                <div className={`rounded-xl p-3 ${isPositive ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40" : "bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40"}`}>
                  <p className={`text-xs font-bold ${isPositive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    {fmt(d.projected)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
          Avg daily inflow: {fmt(avgDailyInflow)} · Avg daily outflow: {fmt(avgDailyOutflow)}
        </p>
      </div>

      {/* Recent Transactions */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Cash Movements</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last 50 transactions</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
          {(transactions || []).slice(0, 20).map((t: any, i) => (
            <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"}`}>
                {t.type === "income"
                  ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{t.description}</p>
                <p className="text-xs text-slate-400">{t.transaction_date?.substring(0, 10)}</p>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {t.type === "income" ? "+" : "-"}{fmt(Number(t.amount))}
              </span>
            </div>
          ))}
          {(transactions || []).length === 0 && (
            <p className="text-center py-8 text-slate-400 text-sm">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Reconciliations */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-500" /> Bank Reconciliations
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Match bank statements to ledger</p>
          </div>
        </div>
        {reconError ? (
          <div className="p-8 text-center text-slate-400 text-sm">Bank reconciliation feature requires migration 014.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                  {["Account", "Period", "Statement Balance", "Book Balance", "Difference", "Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(reconciliations || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No reconciliations yet. Use the button above to start one.
                    </td>
                  </tr>
                ) : (
                  (reconciliations || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">{r.bank_accounts?.name || "—"}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.period_start} → {r.period_end}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 dark:text-slate-100">{fmt(Number(r.statement_balance))}</td>
                      <td className="py-3 px-4 text-sm text-slate-900 dark:text-slate-100">{fmt(Number(r.book_balance))}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={Number(r.difference) === 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
                          {Number(r.difference) === 0 ? "✓ Balanced" : fmt(Number(r.difference))}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${r.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                          {r.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
