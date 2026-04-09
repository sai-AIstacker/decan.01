"use client";

import React, { memo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from "recharts";

// Shared tooltip style — created once, not on every render
const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #e4e4e7",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  backgroundColor: "#fff",
  fontSize: 12,
} as const;

// 1. Line Chart Widget
interface LineChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  strokeColor?: string;
}

export const LineChartWidget = memo(function LineChartWidget({ data, xKey, yKey, strokeColor = "#6366f1" }: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#18181b", fontWeight: 500 }} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={strokeColor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: strokeColor, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

// 2. Bar Chart Widget
interface BarChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  fillColor?: string;
}

export const BarChartWidget = memo(function BarChartWidget({ data, xKey, yKey, fillColor = "#6366f1" }: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
        <Bar dataKey={yKey} fill={fillColor} radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
});

// 3. Pie Chart Widget
interface PieChartWidgetProps {
  data: { name: string; value: number }[];
  colors?: string[];
}

export const PieChartWidget = memo(function PieChartWidget({ data, colors = ["#10b981", "#f43f5e", "#f59e0b", "#6366f1", "#8b5cf6"] }: PieChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="40%"
          outerRadius="65%"
          paddingAngle={4}
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
});
