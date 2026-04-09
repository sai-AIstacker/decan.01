"use client";

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface PremiumLineChartProps {
  data: Record<string, any>[];
  lines: { key: string; color: string; label: string }[];
  xKey: string;
  height?: number;
  showGrid?: boolean;
  curved?: boolean;
  filled?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1d1d1f] text-white rounded-[12px] px-3 py-2.5 shadow-xl text-[12px]">
      <p className="font-semibold mb-1.5 text-white/60">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-bold">{typeof p.value === "number" && p.value > 1000
            ? `₹${p.value.toLocaleString("en-IN")}`
            : `${p.value}${p.name?.includes("Attendance") || p.name?.includes("Rate") ? "%" : ""}`
          }</span>
        </div>
      ))}
    </div>
  );
}

export function PremiumLineChart({ data, lines, xKey, height = 200, showGrid = true, curved = true, filled = false }: PremiumLineChartProps) {
  const Chart = filled ? AreaChart : LineChart;
  const type = curved ? "monotone" : "linear";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
        )}
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 500 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
        {lines.map(l => filled ? (
          <Area key={l.key} type={type} dataKey={l.key} name={l.label}
            stroke={l.color} strokeWidth={2.5}
            fill={l.color} fillOpacity={0.08}
            dot={false} activeDot={{ r: 4, fill: l.color, stroke: "white", strokeWidth: 2 }} />
        ) : (
          <Line key={l.key} type={type} dataKey={l.key} name={l.label}
            stroke={l.color} strokeWidth={2.5}
            dot={false} activeDot={{ r: 4, fill: l.color, stroke: "white", strokeWidth: 2 }} />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
}
