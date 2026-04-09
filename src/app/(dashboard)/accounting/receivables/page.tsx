import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, ChevronRight, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function agingBucket(dueDateStr: string): string {
  const now = new Date();
  const due = new Date(dueDateStr);
  const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

const bucketColors: Record<string, string> = {
  "current": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "1-30": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "31-60": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "61-90": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "90+": "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle },
};

export default async function ReceivablesPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, title, amount, due_date, status, created_at, student_id, profiles:student_id(full_name, email)")
    .order("due_date", { ascending: true });

  const allInvoices = (invoices || []) as any[];

  const totalOutstanding = allInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
  const totalOverdue = allInvoices.filter((i) => i.status === "overdue" || (i.status === "pending" && new Date(i.due_date) < new Date())).reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = allInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  const agingTotals = { "current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  allInvoices.filter((i) => i.status !== "paid").forEach((i) => {
    const bucket = agingBucket(i.due_date);
    agingTotals[bucket as keyof typeof agingTotals] += Number(i.amount);
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Receivables</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Accounts Receivable
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track student fee invoices and aging analysis</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Outstanding", value: fmt(totalOutstanding), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60 dark:border-amber-800/40" },
          { label: "Overdue Amount", value: fmt(totalOverdue), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60 dark:border-rose-800/40" },
          { label: "Total Collected", value: fmt(totalPaid), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60 dark:border-emerald-800/40" },
          { label: "Total Invoices", value: allInvoices.length, color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60 dark:border-indigo-800/40" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Aging Analysis */}
      <div className="apple-card p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Aging Analysis
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(agingTotals).map(([bucket, total]) => (
            <div key={bucket} className={`rounded-2xl p-4 text-center ${bucketColors[bucket]}`}>
              <p className="text-xs font-semibold mb-1">{bucket === "current" ? "Current" : `${bucket} days`}</p>
              <p className="text-lg font-bold">{fmt(total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">All Invoices</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{allInvoices.length} total invoices</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Student", "Invoice", "Amount", "Due Date", "Aging", "Status"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allInvoices.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No invoices found</td></tr>
              ) : (
                allInvoices.map((inv) => {
                  const bucket = agingBucket(inv.due_date);
                  const scfg = statusConfig[inv.status] || statusConfig.pending;
                  const StatusIcon = scfg.icon;
                  const student = inv.profiles as { full_name?: string; email?: string } | null;
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{student?.full_name || "Student"}</p>
                        <p className="text-xs text-slate-400">{student?.email || ""}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{inv.title}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(Number(inv.amount))}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${bucketColors[bucket]}`}>
                          {bucket === "current" ? "Current" : `${bucket} days`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${scfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {scfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
