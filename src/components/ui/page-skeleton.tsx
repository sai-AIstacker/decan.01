/**
 * Shared page-level Suspense fallback skeletons.
 * Drop these into Suspense fallback= props instead of bare <div>Loading...</div>.
 */
import { Skeleton } from "@/components/ui/skeleton";

/** Generic table/list loading skeleton — two stat cards + one large table */
export function TablePageSkeleton() {
  return (
    <div className="space-y-4 w-full">
      {/* Search + action bar */}
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      {/* Table body */}
      <Skeleton className="h-[480px] rounded-2xl w-full" />
      {/* Pagination row */}
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/** Stat cards + chart layout (teacher/student dashboards) */
export function StatsSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-[400px] rounded-2xl w-full" />
    </div>
  );
}

/** Timetable grid skeleton */
export function TimetableSkeleton() {
  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 flex-1 rounded-lg" />)}
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-2">
          {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-16 flex-1 rounded-xl" />)}
        </div>
      ))}
    </div>
  );
}
