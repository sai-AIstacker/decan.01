"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToggleRight, Check, X, ShieldAlert } from "lucide-react";
import type { FeatureFlagRow } from "@/types/database";

// Fallback toggle component if shadcn Switch is missing
function SimpleToggle({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (c: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 ${
        checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function FeatureFlagsView() {
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFlags() {
    const { data } = await supabase.from("feature_flags").select("*").order("feature_name", { ascending: true });
    if (data) setFlags(data);
    setLoading(false);
  };

  const toggleFlag = async (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic UI
    setFlags(prev => prev.map(f => f.id === id ? { ...f, is_enabled: newVal } : f));
    
    const { error } = await supabase.from("feature_flags").update({ is_enabled: newVal }).eq("id", id);
    if (error) {
       console.error(error);
       // Revert on fail
       setFlags(prev => prev.map(f => f.id === id ? { ...f, is_enabled: currentVal } : f));
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-500">Evaluating Flag Configurations...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Module Toggles
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Operate organizational feature deployments securely overriding localized operations dynamically.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-400 text-sm">
         <ShieldAlert className="w-5 h-5 shrink-0" />
         <p>Warning: Disrupting operational topologies may instantly lock clients out of expected interfaces. Proceed cautiously.</p>
      </div>

      <div className="apple-card overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
         {flags.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">No organizational arrays found.</div>
         ) : (
            flags.map(flag => {
               // Make the names human readable simply
               const nameParts = flag.feature_name.split('_');
               const humanName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

               return (
                  <div key={flag.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                     <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${flag.is_enabled ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-300' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'}`}>
                           <ToggleRight className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{humanName} Map Parameter</h3>
                           <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Raw systemic bind target: <code className="bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 rounded ml-1 text-xs">{flag.feature_name}</code></p>
                           <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
                              Status: 
                              {flag.is_enabled ? (
                                 <span className="flex items-center text-emerald-600 dark:text-emerald-400"><Check className="w-3 h-3 mr-1" /> ACTIVE</span>
                              ) : (
                                 <span className="flex items-center text-rose-600 dark:text-rose-400"><X className="w-3 h-3 mr-1" /> OFFLINE</span>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="shrink-0 pl-4">
                        <SimpleToggle checked={flag.is_enabled} onCheckedChange={() => toggleFlag(flag.id, flag.is_enabled)} />
                     </div>
                  </div>
               );
            })
         )}
      </div>
    </div>
  );
}
