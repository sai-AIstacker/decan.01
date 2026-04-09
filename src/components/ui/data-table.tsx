"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string; // e.g. for alignment "text-right"
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: keyof T; // Which key to search on
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
}

// Memoized row component — prevents re-render of all rows when search/page changes
const TableRow = React.memo(function TableRow<T>({
  row, columns, rIdx
}: {
  row: T; columns: ColumnDef<T>[]; rIdx: number;
}) {
  return (
    <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors group">
      {columns.map((col, cIdx) => (
        <td key={cIdx} className={`px-4 py-3 align-middle ${col.className || ''}`}>
          {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] || "") : "")}
        </td>
      ))}
    </tr>
  );
}) as <T>(props: { row: T; columns: ColumnDef<T>[]; rIdx: number }) => React.ReactElement;

export function DataTable<T>({ 
   data, 
   columns, 
   searchKey, 
   searchPlaceholder = "Search...", 
   pageSize = 10,
   emptyMessage = "No results found." 
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Derive filtered and paginated data locally
  const filteredData = useMemo(() => {
     if (!searchKey || !search) return data;
     const lowerSearch = search.toLowerCase();
     return data.filter(item => {
        const val = item[searchKey];
        if (typeof val === 'string') return val.toLowerCase().includes(lowerSearch);
        return false;
     });
  }, [data, search, searchKey]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  
  // Enforce page bounds dynamically
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  
  const currentData = useMemo(() => {
     const start = (safePage - 1) * pageSize;
     return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePrev = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);

  return (
    <div className="w-full space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
         {searchKey && (
            <div className="relative w-full sm:max-w-xs">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
               <Input 
                 placeholder={searchPlaceholder} 
                 value={search}
                 onChange={handleSearch}
                 className="pl-9 h-10 w-full bg-white dark:bg-zinc-950/50 border-zinc-200/80 dark:border-zinc-800/80 shadow-sm focus-visible:ring-zinc-500 rounded-xl"
               />
            </div>
         )}
         
         <Button variant="outline" size="sm" className="hidden sm:flex h-10 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-sm">
            <SlidersHorizontal className="w-4 h-4 mr-2 text-zinc-500" /> Options
         </Button>
      </div>

      {/* Main Table Structure */}
      <div className="apple-card overflow-hidden text-sm">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                     {columns.map((col, i) => (
                        <th key={i} className={`h-11 px-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 align-middle ${col.className || ''}`}>
                           {col.header}
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {currentData.length === 0 ? (
                     <tr>
                        <td colSpan={columns.length} className="h-32 text-center align-middle text-zinc-500">
                           {emptyMessage}
                        </td>
                     </tr>
                  ) : (
                     currentData.map((row, rIdx) => (
                        <TableRow key={rIdx} row={row} columns={columns} rIdx={rIdx} />
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2">
         <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing <span className="font-medium text-zinc-900 dark:text-zinc-100">{filteredData.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> to <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min(safePage * pageSize, filteredData.length)}</span> of <span className="font-medium text-zinc-900 dark:text-zinc-100">{filteredData.length}</span> entries
         </div>
         <div className="flex items-center space-x-2">
            <Button
               variant="outline"
               size="sm"
               className="h-8 w-8 p-0 rounded-lg"
               onClick={handlePrev}
               disabled={safePage === 1}
            >
               <ChevronLeft className="h-4 w-4" />
               <span className="sr-only">Previous Page</span>
            </Button>
            <div className="text-xs font-medium w-max px-2 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 h-8 flex items-center justify-center rounded-lg">
               {safePage} / {totalPages}
            </div>
            <Button
               variant="outline"
               size="sm"
               className="h-8 w-8 p-0 rounded-lg"
               onClick={handleNext}
               disabled={safePage === totalPages}
            >
               <ChevronRight className="h-4 w-4" />
               <span className="sr-only">Next Page</span>
            </Button>
         </div>
      </div>
    </div>
  );
}
