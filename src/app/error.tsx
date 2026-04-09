"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function AppBoundaryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Local Router Segment Error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-full min-h-[400px]">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent mb-2">
          Page Failed to Load
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          This specific structural component executed a faulty payload. Remaining systems are operational.
        </p>
        
        <Button 
          onClick={() => reset()} 
          className="rounded-xl bg-[#1d1d1f] text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          <RefreshCcw className="w-4 h-4 mr-2" /> Reload Component
        </Button>
      </div>
    </div>
  );
}
