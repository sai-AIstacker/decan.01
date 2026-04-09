"use client";

import { useTransition } from "react";
import { TrendingDown, Loader2 } from "lucide-react";
import { runDepreciation } from "../../actions";
import { toast } from "sonner";

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RunDepreciationButton({ assetId, assetName }: { assetId: string; assetName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Run monthly depreciation for "${assetName}"?`)) return;
    startTransition(async () => {
      const result = await runDepreciation(assetId);
      if (result.success) {
        toast.success(`Depreciation recorded: ${fmt(result.monthlyDepreciation || 0)}`);
      } else {
        toast.error(result.error || "Failed to run depreciation");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/40 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingDown className="w-3.5 h-3.5" />}
      Depreciate
    </button>
  );
}
