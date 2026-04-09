import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Database, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

// Minimal Audit Logs UI fetching explicitly
export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createClient();
  const params: Record<string, string | undefined> = await searchParams ?? {};

  const page = typeof params?.page === 'string' ? parseInt(params.page) : 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("*, profiles!audit_logs_user_id_fkey(full_name)", { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          System Audit Tracking
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Raw global database event traces detailing table mutations and execution context.
        </p>
      </div>

      <div className="apple-card overflow-hidden">
        
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Database className="w-5 h-5 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300" />
               <span className="font-semibold">Event Traces ({count || 0})</span>
            </div>
            
            <div className="flex gap-3">
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                 <Input className="pl-9 h-9 w-[250px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-sm" placeholder="Search parameters..." disabled />
               </div>
               <button className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                 <Filter className="w-3.5 h-3.5" /> Filter
               </button>
            </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-sm text-left">
             <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 text-zinc-500 border-b border-zinc-200/50 dark:border-zinc-800/50">
               <tr>
                 <th className="px-6 py-3 font-medium">Timestamp</th>
                 <th className="px-6 py-3 font-medium">Origin User</th>
                 <th className="px-6 py-3 font-medium">Action</th>
                 <th className="px-6 py-3 font-medium">Target Table</th>
                 <th className="px-6 py-3 font-medium text-right">Details</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/30">
                {!logs || logs.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                       No audit entries traced yet. Wait for a database mutation to occur.
                     </td>
                   </tr>
                ) : (
                   logs.map(log => {
                      // Styling based on mutation type
                      let badgeColor = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
                      if (log.action === 'INSERT') badgeColor = "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-300 border-zinc-200 dark:border-blue-500/20";
                      if (log.action === 'UPDATE') badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
                      if (log.action === 'DELETE') badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20";

                      return (
                         <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                           <td className="px-6 py-3 font-mono text-[11px] text-zinc-500">
                             {new Date(log.created_at).toLocaleString()}
                           </td>
                           <td className="px-6 py-3 font-medium">
                             {log.profiles?.full_name || 'System Generated'}
                           </td>
                           <td className="px-6 py-3">
                             <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${badgeColor}`}>
                                {log.action}
                             </span>
                           </td>
                           <td className="px-6 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">
                             {log.table_name}
                           </td>
                           <td className="px-6 py-3 text-right">
                             <button 
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs text-left w-32 truncate block ml-auto"
                                title={JSON.stringify(log.payload)}
                             >
                               {log.payload ? JSON.stringify(log.payload).substring(0, 30) + '...' : 'Unknown Mapping'}
                             </button>
                           </td>
                         </tr>
                      )
                   })
                )}
             </tbody>
           </table>
        </div>
        
        {/* Basic Pagination Header */}
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center text-sm text-zinc-500">
           <span>Showing page {page} of {Math.ceil((count || 0) / limit)}</span>
           <div className="flex gap-2">
              <button disabled className="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded disabled:opacity-50">Previous</button>
              <button disabled className="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded disabled:opacity-50">Next</button>
           </div>
        </div>

      </div>
    </div>
  );
}
