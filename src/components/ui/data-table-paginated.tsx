"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";

export interface Column<T> {
  header: string;
  key?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  fetchData: (params: { page: number; limit: number; search: string; sort?: string; dir?: "asc" | "desc" }) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

function Skeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-4 rounded-full bg-[var(--surface-2)] animate-pulse ${j === 0 ? "w-32" : j === cols - 1 ? "w-16 ml-auto" : "w-24"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DataTablePaginated<T>({
  columns, fetchData, pageSize = 15, searchPlaceholder = "Search…", emptyMessage = "No results found.", rowKey,
}: Props<T>) {
  const [data, setData]       = useState<T[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort]       = useState<string | undefined>();
  const [dir, setDir]         = useState<"asc" | "desc">("asc");
  const searchTimer           = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async (p: number, q: string, s?: string, d?: "asc" | "desc") => {
    setLoading(true);
    try {
      const res = await fetchData({ page: p, limit: pageSize, search: q, sort: s, dir: d });
      setData(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [fetchData, pageSize]);

  useEffect(() => { load(page, search, sort, dir); }, [page, sort, dir]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, val, sort, dir); }, 300);
  };

  const handleSort = (key: string) => {
    if (sort === key) { const nd = dir === "asc" ? "desc" : "asc"; setDir(nd); load(page, search, key, nd); }
    else { setSort(key); setDir("asc"); load(page, search, key, "asc"); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="apple-card overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--foreground)] transition-colors"
          />
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />}
        <span className="text-[12px] text-[var(--muted-foreground)] ml-auto">{total} total</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              {columns.map((col, i) => (
                <th key={i}
                  onClick={() => col.sortable && col.key && handleSort(String(col.key))}
                  className={`text-left py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-[var(--foreground)] select-none" : ""} ${col.className || ""}`}>
                  {col.header}
                  {col.sortable && col.key && sort === String(col.key) && (
                    <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="p-0">
                <Skeleton rows={pageSize > 10 ? 8 : pageSize} cols={columns.length} />
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length}>
                <div className="py-16 text-center text-[13px] text-[var(--muted-foreground)]">{emptyMessage}</div>
              </td></tr>
            ) : data.map(row => (
              <tr key={rowKey(row)} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={`py-3 px-4 text-[13px] text-[var(--foreground)] ${col.className || ""}`}>
                    {col.cell ? col.cell(row) : col.key ? String((row as any)[col.key] ?? "—") : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-[12px] text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center border border-[var(--border)] text-[var(--foreground)] disabled:opacity-30 hover:bg-[var(--surface-2)] transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-[8px] text-[12px] font-semibold border transition-colors ${p === page ? "bg-[#1d1d1f] border-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f]" : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center border border-[var(--border)] text-[var(--foreground)] disabled:opacity-30 hover:bg-[var(--surface-2)] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
