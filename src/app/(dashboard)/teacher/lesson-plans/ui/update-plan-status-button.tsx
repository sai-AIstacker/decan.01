"use client";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateLessonPlanStatus } from "../../actions";
import { toast } from "sonner";

export function UpdatePlanStatusButton({ planId, currentStatus }: { planId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const next = currentStatus === "draft" ? "published" : currentStatus === "published" ? "completed" : null;
  if (!next) return null;

  function handleClick() {
    startTransition(async () => {
      const result = await updateLessonPlanStatus(planId, next as any);
      if (result.success) toast.success(`Marked as ${next}`);
      else toast.error(result.error || "Failed");
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-zinc-200/60 dark:border-indigo-800/40 transition-colors disabled:opacity-60 capitalize">
      {isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `→ ${next}`}
    </button>
  );
}
