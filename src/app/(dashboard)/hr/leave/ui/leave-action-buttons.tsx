"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { updateLeaveStatus } from "../../actions";
import { toast } from "sonner";

export function LeaveActionButtons({ leaveId }: { leaveId: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await updateLeaveStatus(leaveId, "approved");
      if (result.success) toast.success("Leave approved");
      else toast.error(result.error || "Failed");
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await updateLeaveStatus(leaveId, "rejected", reason);
      if (result.success) { toast.success("Leave rejected"); setRejectOpen(false); }
      else toast.error(result.error || "Failed");
    });
  }

  return (
    <>
      <div className="flex gap-1.5">
        <button onClick={handleApprove} disabled={isPending} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors disabled:opacity-60">
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
        </button>
        <button onClick={() => setRejectOpen(true)} disabled={isPending} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/40 transition-colors disabled:opacity-60">
          <XCircle className="w-3 h-3" /> Reject
        </button>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm apple-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Reject Leave</h3>
              <button onClick={() => setRejectOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason for rejection</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
