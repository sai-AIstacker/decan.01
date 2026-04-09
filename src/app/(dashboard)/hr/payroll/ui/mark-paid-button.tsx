"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { markPayrollPaid } from "../../actions";
import { toast } from "sonner";

export function MarkPaidButton({ payrollId }: { payrollId: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("bank_transfer");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await markPayrollPaid(payrollId, method);
      if (result.success) { toast.success("Salary marked as paid"); setOpen(false); }
      else toast.error(result.error || "Failed");
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors">
        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm apple-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Mark Salary Paid</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "bank_transfer", label: "Bank Transfer" }, { value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "upi", label: "UPI" }].map((m) => (
                  <button key={m.value} type="button" onClick={() => setMethod(m.value)} className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${method === m.value ? "bg-[#1d1d1f] text-white border-emerald-600" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleConfirm} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#3a3a3c] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
