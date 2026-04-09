"use client";

import { useTransition } from "react";
import { Zap, Loader2 } from "lucide-react";
import { bulkProcessPayroll } from "../../actions";
import { toast } from "sonner";

export function BulkProcessButton({ month }: { month: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const label = new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" });
    if (!confirm(`Generate payroll for all active staff for ${label}?`)) return;
    startTransition(async () => {
      const result = await bulkProcessPayroll(month);
      if (result.success) toast.success(`Payroll generated for ${result.count} staff members`);
      else toast.error(result.error || "Failed to process payroll");
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />}
      {isPending ? "Processing..." : "Bulk Process"}
    </button>
  );
}
