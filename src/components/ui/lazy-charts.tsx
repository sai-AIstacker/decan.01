"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Skeleton shown while recharts loads
function ChartSkeleton() {
  return (
    <div className="w-full h-full flex items-end gap-1 px-2 pb-2 animate-pulse">
      {[40, 65, 45, 80, 55, 70].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-[var(--surface-2)]" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function PieSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center animate-pulse">
      <div className="w-24 h-24 rounded-full border-8 border-[var(--surface-2)] border-t-[var(--surface-3)]" />
    </div>
  );
}

interface LineChartProps { data: any[]; xKey: string; yKey: string; strokeColor?: string; }
interface BarChartProps  { data: any[]; xKey: string; yKey: string; fillColor?: string; }
interface PieChartProps  { data: { name: string; value: number }[]; colors?: string[]; }

export const LazyLineChart = dynamic<LineChartProps>(
  () => import("./analytics-charts").then(m => m.LineChartWidget as ComponentType<LineChartProps>),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const LazyBarChart = dynamic<BarChartProps>(
  () => import("./analytics-charts").then(m => m.BarChartWidget as ComponentType<BarChartProps>),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const LazyPieChart = dynamic<PieChartProps>(
  () => import("./analytics-charts").then(m => m.PieChartWidget as ComponentType<PieChartProps>),
  { ssr: false, loading: () => <PieSkeleton /> }
);
