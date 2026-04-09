"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ideally map this to Sentry or a global logging orchestrator
    console.error("Global Decan School Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full apple-card overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent mb-2">
                System Execution Fault
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-[280px]">
                An unexpected structural error caused this page to fail. Our operations team has been notified.
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => reset()} 
                  className="flex-1 rounded-xl bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-md shadow-indigo-600/20"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  className="flex-1 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <Link href="/dashboard">
                    <Home className="w-4 h-4 mr-2 text-zinc-500" /> Dashboard
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Developer Context Mode */}
            {process.env.NODE_ENV === 'development' && (
               <div className="bg-zinc-100 dark:bg-black/50 border-t border-zinc-200 dark:border-zinc-800 p-4 text-left">
                 <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">
                   <strong>Dev Trace:</strong> {error.message || "Unknown Object Reference"}
                 </p>
               </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
