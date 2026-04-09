import { getSessionProfile, hasRole } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, ChevronRight, Clock, CheckCircle2, Send, FileEdit, XCircle, Plus } from "lucide-react";
import Link from "next/link";
import { CreateJournalForm } from "./ui/create-journal-form";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: FileEdit },
  submitted: { label: "Submitted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Send },
  approved: { label: "Approved", color: "bg-blue-100 text-zinc-900 dark:bg-zinc-800 dark:text-blue-300", icon: CheckCircle2 },
  posted: { label: "Posted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle },
};

export default async function JournalsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || (!hasRole(profile.roles, "accounting") && !hasRole(profile.roles, "admin"))) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [journalResult, accountsResult] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("*, journal_entry_lines(*), profiles:created_by(full_name)")
      .order("entry_date", { ascending: false })
      .limit(50),
    supabase
      .from("chart_of_accounts")
      .select("id, account_code, name, account_type")
      .eq("status", "active")
      .order("account_code"),
  ]);

  const { data: journals, error } = journalResult;
  const accounts = accountsResult.data || [];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Journal Management
          </h1>
          <CreateJournalForm accounts={accounts} />
        </div>
        <div className="rounded-3xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-8 text-center">
          <p className="text-orange-700 dark:text-orange-300 font-medium">Journal tables not yet available</p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Run migration 014 in your Supabase dashboard to enable journal management.
          </p>
        </div>
      </div>
    );
  }

  const allJournals = (journals || []) as any[];
  const statusCounts = allJournals.reduce((acc: Record<string, number>, j: any) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  const totalPostedAmount = allJournals
    .filter((j: any) => j.status === "posted")
    .reduce((sum: number, j: any) => {
      const lines = j.journal_entry_lines || [];
      return sum + lines.filter((l: any) => l.entry_type === "debit").reduce((s: number, l: any) => s + Number(l.amount), 0);
    }, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/accounting" className="hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-indigo-400">Finance</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Journals</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              Journal Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Double-entry journal entries with debit/credit validation</p>
          </div>
          <CreateJournalForm accounts={accounts} />
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, cfg]) => {
          const Icon = cfg.icon;
          const bgClass = cfg.color.split(" ").filter((c) => c.startsWith("bg-") || c.includes("dark:bg")).join(" ");
          return (
            <div key={status} className={`rounded-2xl border border-slate-200/60 dark:border-slate-700/50 p-4 ${bgClass}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
            </div>
          );
        })}
      </div>

      {/* Total Posted */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 p-5 text-white">
        <p className="text-slate-300 text-sm">Total Posted Amount (Current Period)</p>
        <p className="text-3xl font-bold mt-1">{fmt(totalPostedAmount)}</p>
        <p className="text-slate-400 text-xs mt-1">{statusCounts.posted || 0} posted entries</p>
      </div>

      {/* Journals List */}
      <div className="apple-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Journal Entries</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{allJournals.length} entries</p>
        </div>

        {allJournals.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No journal entries yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
              Create your first journal entry using the button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allJournals.map((journal: any) => {
              const cfg = statusConfig[journal.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              const lines = journal.journal_entry_lines || [];
              const totalDebit = lines
                .filter((l: any) => l.entry_type === "debit")
                .reduce((s: number, l: any) => s + Number(l.amount), 0);
              const totalCredit = lines
                .filter((l: any) => l.entry_type === "credit")
                .reduce((s: number, l: any) => s + Number(l.amount), 0);
              const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

              return (
                <div key={journal.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{journal.reference}</span>
                        {journal.is_recurring && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-medium">
                            Recurring
                          </span>
                        )}
                        {!isBalanced && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-xs font-medium">
                            Unbalanced
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{journal.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {journal.entry_date} · By {journal.profiles?.full_name || "System"} · {lines.length} lines
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <div className="mt-2 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">Dr: {fmt(totalDebit)}</span>
                        {" / "}
                        <span className="text-rose-600 dark:text-rose-400">Cr: {fmt(totalCredit)}</span>
                      </div>
                    </div>
                  </div>

                  {lines.length > 0 && (
                    <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 overflow-x-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr className="text-slate-500 dark:text-slate-400">
                            <th className="text-left pb-1.5 font-medium">Account</th>
                            <th className="text-left pb-1.5 font-medium">Code</th>
                            <th className="text-right pb-1.5 font-medium">Debit</th>
                            <th className="text-right pb-1.5 font-medium">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line: any) => (
                            <tr key={line.id} className="border-t border-slate-200/60 dark:border-slate-700/60">
                              <td className="py-1.5 text-slate-700 dark:text-slate-300">{line.account_name}</td>
                              <td className="py-1.5 font-mono text-slate-400">{line.account_code}</td>
                              <td className="py-1.5 text-right text-emerald-700 dark:text-emerald-300 font-medium">
                                {line.entry_type === "debit" ? fmt(Number(line.amount)) : "—"}
                              </td>
                              <td className="py-1.5 text-right text-rose-700 dark:text-rose-300 font-medium">
                                {line.entry_type === "credit" ? fmt(Number(line.amount)) : "—"}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                            <td colSpan={2} className="py-1.5 text-slate-600 dark:text-slate-400">Total</td>
                            <td className="py-1.5 text-right text-emerald-700 dark:text-emerald-300">{fmt(totalDebit)}</td>
                            <td className="py-1.5 text-right text-rose-700 dark:text-rose-300">{fmt(totalCredit)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
