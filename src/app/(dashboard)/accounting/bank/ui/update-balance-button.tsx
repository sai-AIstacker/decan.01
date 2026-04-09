"use client";

import { useState, useTransition } from "react";
import { Edit2, X, Loader2 } from "lucide-react";
import { updateBankBalance } from "../../actions";
import { toast } from "sonner";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function UpdateBalanceButton({
  accountId,
  accountName,
  currentBalance,
}: {
  accountId: string;
  accountName: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [newBalance, setNewBalance] = useState(currentBalance.toString());
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const balance = parseFloat(newBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("Enter a valid balance");
      return;
    }
    startTransition(async () => {
      const result = await updateBankBalance(accountId, balance, note || "Manual adjustment");
      if (result.success) {
        toast.success("Balance updated");
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to update balance");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5" /> Adjust Balance
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm apple-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Adjust Balance</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{accountName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Bank statement reconciliation"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleConfirm} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isPending ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
