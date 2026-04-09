import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { KPISparkline } from "./kpi-sparkline";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  icon: LucideIcon;
  className?: string;
  sparkline?: number[];
  color?: "indigo" | "green" | "red" | "amber" | "blue" | "purple" | "teal" | "mono";
}

const colorMap: Record<string, {
  card: string;
  icon: string;
  value: string;
  trend: string;
  stroke: string;
  grad: string;
}> = {
  blue:   { card: "apple-card-blue",   icon: "bg-white/20 text-white",         value: "text-white",         trend: "text-white/80",  stroke: "#fff", grad: "#fff" },
  green:  { card: "apple-card-green",  icon: "bg-white/20 text-white",         value: "text-white",         trend: "text-white/80",  stroke: "#fff", grad: "#fff" },
  red:    { card: "apple-card-red",    icon: "bg-white/20 text-white",         value: "text-white",         trend: "text-white/80",  stroke: "#fff", grad: "#fff" },
  amber:  { card: "apple-card-amber",  icon: "bg-black/10 text-[#0a0a0a]",    value: "text-[#0a0a0a]",     trend: "text-black/60",  stroke: "#0a0a0a", grad: "#0a0a0a" },
  purple: { card: "apple-card-purple", icon: "bg-white/20 text-white",         value: "text-white",         trend: "text-white/80",  stroke: "#fff", grad: "#fff" },
  teal:   { card: "apple-card-teal",   icon: "bg-black/10 text-[#0a0a0a]",    value: "text-[#0a0a0a]",     trend: "text-black/60",  stroke: "#0a0a0a", grad: "#0a0a0a" },
  indigo: { card: "",                  icon: "bg-[var(--surface-2)] text-[var(--foreground)]", value: "text-[var(--foreground)]", trend: "text-[var(--muted-foreground)]", stroke: "#6366f1", grad: "#6366f1" },
  mono:   { card: "",                  icon: "bg-[var(--surface-2)] text-[var(--foreground)]", value: "text-[var(--foreground)]", trend: "text-[var(--muted-foreground)]", stroke: "#6366f1", grad: "#6366f1" },
};

export function KPICard({ title, value, description, trend, icon: Icon, className, sparkline, color = "indigo" }: KPICardProps) {
  const c = colorMap[color] ?? colorMap.indigo;
  const isColored = !["indigo", "mono"].includes(color);

  return (
    <div className={cn(
      // Mobile: fixed equal-width card in carousel
      "w-[152px] min-w-[152px] lg:w-auto lg:min-w-0",
      "apple-card p-4 lg:p-5 flex flex-col gap-2.5 lg:gap-3 overflow-hidden shrink-0 lg:shrink",
      isColored && c.card,
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("label-xs", isColored ? "text-white/70 dark:text-white/70" : "")}>{title}</p>
        <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 border border-black/10", c.icon)}>
          <Icon size={15} />
        </div>
      </div>

      <div>
        <p className={cn("text-[20px] lg:text-[24px] font-black tracking-tight mono-num leading-none kpi-value", c.value)}>
          {value}
        </p>
        {trend && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend.isPositive
              ? <TrendingUp size={11} className={isColored ? "text-white/80" : "text-emerald-500"} />
              : <TrendingDown size={11} className={isColored ? "text-white/80" : "text-red-500"} />}
            <span className={cn("text-[11px] font-bold", isColored ? c.trend : trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
            {!isColored && <span className="text-[11px] text-[var(--muted-foreground)]">vs last month</span>}
          </div>
        )}
        {description && !trend && (
          <p className={cn("text-[11px] mt-1 font-medium", isColored ? c.trend : "text-[var(--muted-foreground)]")}>
            {description}
          </p>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <KPISparkline data={sparkline} stroke={c.stroke} grad={c.grad} title={title} color={color as any} />
      )}
    </div>
  );
}
