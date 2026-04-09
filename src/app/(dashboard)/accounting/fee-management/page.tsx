import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Users, ChevronRight, CheckCircle2, Clock, XCircle,
  GraduationCap, Gift, Plus, TrendingUp, AlertTriangle,
  CreditCard, Download, Search
} from "lucide-react";
import Link from "next/link";
import { CreateInvoiceForm } from "./ui/create-invoice-form";
import { MarkPaidButton } from "./ui/mark-paid-button";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function FeeManagementPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};
  const statusFilter = params.status || "all";
  const searchQuery = params.search || "";
  const page = parseInt(params.page || "1");
  const pageSize = 20;

  const [
    { data: invoices },
    { data: payments },
    { data: scholarships },
    { data: scholarshipAllocations },
    { data: students },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, title, amount, status, due_date, student_id, created_at, profiles:student_id(full_name, email)")
      .order("created_at", { ascending: false }),
    supabase.from("payments").select("amount_paid, payment_method, payment_date").limit(500),
    supabase.from("scholarships").select("*"),
    supabase
      .from("scholarship_allocations")
      .select("*, scholarships(name), profiles:student_id(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .rpc("get_student_profiles"),
    supabase.from("finance_categories").select("id, name").eq("type", "income"),
  ]);

  const allInvoices = (invoices || []) as any[];
  const allPayments = (payments || []) as any[];

  // KPIs
  const totalFeesBilled = allInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = allPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalOutstanding = allInvoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
  const totalOverdue = allInvoices
    .filter((i) => i.status === "overdue" || (i.status === "pending" && new Date(i.due_date) < new Date()))
    .reduce((s, i) => s + Number(i.amount), 0);
  const collectionRate = totalFeesBilled > 0 ? (totalCollected / totalFeesBilled) * 100 : 0;

  const statusCounts = {
    all: allInvoices.length,
    paid: allInvoices.filter((i) => i.status === "paid").length,
    pending: allInvoices.filter((i) => i.status === "pending").length,
    overdue: allInvoices.filter((i) => i.status === "overdue").length,
  };

  const methodSummary: Record<string, number> = {};
  allPayments.forEach((p: any) => {
    methodSummary[p.payment_method] = (methodSummary[p.payment_method] || 0) + Number(p.amount_paid);
  });

  // Filter invoices
  let filtered = allInvoices;
  if (statusFilter !== "all") filtered = filtered.filter((i) => i.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        (i.profiles as any)?.full_name?.toLowerCase().includes(q) ||
        (i.profiles as any)?.email?.toLowerCase().includes(q)
    );
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allScholarships = (scholarships || []) as any[];
  const allAllocations = (scholarshipAllocations || []) as any[];
  const totalScholarshipAmount = allAllocations.reduce((s, a) => s + Number(a.allocated_amount), 0);

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
    overdue: { label: "Overdue", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Fee Management</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              Fee Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Student fee invoicing, collection, and scholarship management</p>
          </div>
          <CreateInvoiceForm students={students || []} categories={categories || []} />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Billed", value: fmt(totalFeesBilled), color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800 dark:bg-indigo-950/30", border: "border-zinc-200/60" },
          { label: "Collected", value: fmt(totalCollected), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60" },
          { label: "Outstanding", value: fmt(totalOutstanding), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60" },
          { label: "Overdue", value: fmt(totalOverdue), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60" },
          { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200/60" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border ${kpi.border} ${kpi.bg} p-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Collection Rate Bar */}
      <div className="apple-card p-4">
        <div className="flex justify-between mb-2 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Fee Collection Progress</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{collectionRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
            style={{ width: `${Math.min(100, collectionRate)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>Collected: {fmt(totalCollected)}</span>
          <span>Total Billed: {fmt(totalFeesBilled)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Status */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-green-500" /> Invoice Status
          </h2>
          <div className="space-y-3">
            {[
              { label: "Paid", count: statusCounts.paid, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
              { label: "Pending", count: statusCounts.pending, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
              { label: "Overdue", count: statusCounts.overdue, color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400" },
            ].map((s) => {
              const total = allInvoices.length || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                    <span className={`font-semibold ${s.textColor}`}>{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" /> Payment Methods
          </h2>
          <div className="space-y-3">
            {Object.keys(methodSummary).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No payments recorded yet</p>
            ) : (
              Object.entries(methodSummary)
                .sort((a, b) => b[1] - a[1])
                .map(([method, amt]) => {
                  const pct = totalCollected > 0 ? Math.round((amt / totalCollected) * 100) : 0;
                  const colors: Record<string, string> = {
                    cash: "bg-emerald-500",
                    card: "bg-zinc-900 dark:bg-zinc-100",
                    bank_transfer: "bg-zinc-900 dark:bg-zinc-100",
                    online: "bg-purple-500",
                  };
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-slate-600 dark:text-slate-400">{method.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt(amt)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[method] || "bg-slate-500"} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Scholarships */}
        <div className="apple-card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" /> Scholarships
          </h2>
          <div className="mb-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40">
            <p className="text-xs text-purple-600 dark:text-purple-400">Total Awarded</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{fmt(totalScholarshipAmount)}</p>
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{allAllocations.length} allocations</p>
          </div>
          <div className="space-y-2">
            {allScholarships.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">No scholarship programs</p>
            ) : (
              allScholarships.slice(0, 4).map((sch: any) => (
                <div key={sch.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{sch.name}</p>
                  {sch.discount_percentage && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                      {sch.discount_percentage}%
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invoice Table with Filters */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Student Fee Invoices</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} invoices</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status Filter */}
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                {(["all", "paid", "pending", "overdue"] as const).map((s) => (
                  <Link
                    key={s}
                    href={`?status=${s}${searchQuery ? `&search=${searchQuery}` : ""}`}
                    className={`px-3 py-2 font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-[#1d1d1f] text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {s} ({statusCounts[s as keyof typeof statusCounts]})
                  </Link>
                ))}
              </div>
              <Link
                href="/accounting/collect-payment"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#3a3a3c] transition-colors"
              >
                <Plus className="w-4 h-4" /> Collect Payment
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/50">
                {["Student", "Invoice Title", "Amount", "Due Date", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No invoices found
                  </td>
                </tr>
              ) : (
                paginated.map((inv: any) => {
                  const student = inv.profiles as { full_name?: string; email?: string } | null;
                  const scfg = statusConfig[inv.status] || statusConfig.pending;
                  const StatusIcon = scfg.icon;
                  const isOverdue = inv.status === "pending" && new Date(inv.due_date) < new Date();
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{student?.full_name || "—"}</p>
                        <p className="text-xs text-slate-400">{student?.email}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{inv.title}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(Number(inv.amount))}</td>
                      <td className="py-3 px-4">
                        <p className={`text-sm ${isOverdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                          {inv.due_date}
                        </p>
                        {isOverdue && <p className="text-xs text-rose-500">Overdue</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${scfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{inv.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {inv.status !== "paid" && (
                          <MarkPaidButton invoiceId={inv.id} amount={Number(inv.amount)} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`?status=${statusFilter}&page=${page - 1}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?status=${statusFilter}&page=${page + 1}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
