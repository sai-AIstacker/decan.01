"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createJournalEntry } from "../../actions";
import { toast } from "sonner";

interface Account {
  id: string;
  account_code: string;
  name: string;
  account_type: string;
}

interface JournalLine {
  account_code: string;
  account_name: string;
  entry_type: "debit" | "credit";
  amount: number;
  description: string;
}

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CreateJournalForm({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lines, setLines] = useState<JournalLine[]>([
    { account_code: "", account_name: "", entry_type: "debit", amount: 0, description: "" },
    { account_code: "", account_name: "", entry_type: "credit", amount: 0, description: "" },
  ]);

  const totalDebits = lines.filter((l) => l.entry_type === "debit").reduce((s, l) => s + l.amount, 0);
  const totalCredits = lines.filter((l) => l.entry_type === "credit").reduce((s, l) => s + l.amount, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  function addLine() {
    setLines([...lines, { account_code: "", account_name: "", entry_type: "debit", amount: 0, description: "" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof JournalLine, value: string | number) {
    const updated = [...lines];
    if (field === "account_code") {
      const account = accounts.find((a) => a.account_code === value);
      updated[index] = {
        ...updated[index],
        account_code: String(value),
        account_name: account?.name || "",
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setLines(updated);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Debits must equal Credits before posting");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("lines", JSON.stringify(lines));

    startTransition(async () => {
      const result = await createJournalEntry(formData);
      if (result.success) {
        toast.success("Journal entry posted successfully");
        setOpen(false);
        setLines([
          { account_code: "", account_name: "", entry_type: "debit", amount: 0, description: "" },
          { account_code: "", account_name: "", entry_type: "credit", amount: 0, description: "" },
        ]);
      } else {
        toast.error(result.error || "Failed to post journal entry");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" /> New Journal Entry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl apple-card my-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Journal Entry</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="description"
                    type="text"
                    required
                    placeholder="e.g. Monthly salary payment"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="entry_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reference</label>
                <input
                  name="reference"
                  type="text"
                  placeholder="e.g. JE-2025-001 (auto-generated if blank)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              {/* Journal Lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Journal Lines</label>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isBalanced ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}>
                    {isBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {isBalanced ? "Balanced" : `Diff: ${fmt(Math.abs(totalDebits - totalCredits))}`}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Account</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Amount (₹)</th>
                        <th className="py-2.5 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-2 px-3">
                            <select
                              value={line.account_code}
                              onChange={(e) => updateLine(i, "account_code", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500"
                            >
                              <option value="">Select account...</option>
                              {accounts.map((a) => (
                                <option key={a.id} value={a.account_code}>
                                  {a.account_code} - {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={line.entry_type}
                              onChange={(e) => updateLine(i, "entry_type", e.target.value)}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 ${
                                line.entry_type === "debit"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 focus:ring-emerald-500"
                                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 focus:ring-rose-500"
                              }`}
                            >
                              <option value="debit">Debit</option>
                              <option value="credit">Credit</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.amount || ""}
                              onChange={(e) => updateLine(i, "amount", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              disabled={lines.length <= 2}
                              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <td className="py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Total</td>
                        <td className="py-2 px-3"></td>
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Dr: {fmt(totalDebits)}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Cr: {fmt(totalCredits)}</span>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add line
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !isBalanced}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isPending ? "Posting..." : "Post Journal Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
