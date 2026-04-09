"use client";

import { KPICard } from "@/components/ui/dashboard-kpi-card";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComponentType } from "react";

// Props mirroring analytics-charts.tsx named exports
interface LineChartProps { data: any[]; xKey: string; yKey: string; strokeColor?: string; }
interface PieChartProps  { data: { name: string; value: number }[]; colors?: string[]; }

const LineChartWidget = dynamic<LineChartProps>(
  () => import("@/components/ui/analytics-charts").then(m => m.LineChartWidget as ComponentType<LineChartProps>),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-xl" /> }
);

const PieChartWidget = dynamic<PieChartProps>(
  () => import("@/components/ui/analytics-charts").then(m => m.PieChartWidget as ComponentType<PieChartProps>),
  { ssr: false, loading: () => <Skeleton className="h-[240px] w-full rounded-xl" /> }
);
import { Users, GraduationCap, Building2, Calendar, Target, TrendingUp, CreditCard, Wallet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminDashboardData {
  kpis: {
    students: number;
    teachers: number;
    classes: number;
    academicYear: string;
    todayAttendancePct: number;
    totalFeesCollected: number;
    pendingDues: number;
    avgMarksPct: number;
    passRate: number;
    paidCount: number;
    pendingCount: number;
  };
  charts: {
    attendanceTrend: { name: string, attendance: number }[];
    feeStatus: { name: string, value: number }[];
  };
}

export default function AdminDashboardView({ data }: { data: AdminDashboardData }) {
  const { kpis, charts } = data;

  const downloadCSV = () => {
    // Generate simple summary CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Students,${kpis.students}\n`;
    csvContent += `Total Teachers,${kpis.teachers}\n`;
    csvContent += `Total Classes,${kpis.classes}\n`;
    csvContent += `Daily Attendance (%),${kpis.todayAttendancePct}\n`;
    csvContent += `Average Marks (%),${kpis.avgMarksPct}\n`;
    csvContent += `Pass Rate (%),${kpis.passRate}\n`;
    csvContent += `Fees Collected ($),${kpis.totalFeesCollected}\n`;
    csvContent += `Pending Dues ($),${kpis.pendingDues}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin_analytics_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex justify-end mb-4">
        <Button onClick={downloadCSV} variant="outline" className="border-zinc-200 text-indigo-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700/30 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:bg-zinc-100/10 rounded-xl transition-all h-9">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Primary Infrastructure KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Total Students" 
          value={kpis.students} 
          icon={Users} 
          description="Active enrollments"
          
        />
        <KPICard 
          title="Total Teachers" 
          value={kpis.teachers} 
          icon={GraduationCap} 
          description="Registered teaching staff"
          
        />
        <KPICard 
          title="Total Classes" 
          value={kpis.classes} 
          icon={Building2} 
          description="Active sections"
          
        />
        <KPICard 
          title="Academic Year" 
          value={kpis.academicYear} 
          icon={Calendar} 
          description="Current context"
          
        />
      </div>

      {/* Deep Analytics Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Today's Attendance" 
          value={`${kpis.todayAttendancePct}%`} 
          icon={Target} 
          trend={{ value: 2.1, isPositive: true }}
          
        />
        <KPICard 
          title="Academic Pass Rate" 
          value={`${kpis.passRate}%`} 
          icon={TrendingUp} 
          description="Overall system exam clearance"
          
        />
        <KPICard 
          title="Collected Fees" 
          value={`$${kpis.totalFeesCollected.toLocaleString()}`} 
          icon={Wallet} 
          trend={{ value: 12.4, isPositive: true }}
          
        />
        <KPICard 
          title="Pending Dues" 
          value={`$${kpis.pendingDues.toLocaleString()}`} 
          icon={CreditCard} 
          trend={{ value: 4.2, isPositive: false }}
          
        />
      </div>

      {/* Visual Charts */}
      <div className="grid gap-6 lg:grid-cols-2 pt-2">
        <div className="apple-card flex flex-col">
           <div className="mb-6">
              <h3 className="font-semibold text-lg">Attendance Trend</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly presence aggregation</p>
           </div>
           <div className="flex-1">
             <LineChartWidget 
                data={charts.attendanceTrend} 
                xKey="name" 
                yKey="attendance" 
                strokeColor="#6366f1"
             />
           </div>
        </div>

        <div className="apple-card flex flex-col">
           <div className="mb-6">
              <h3 className="font-semibold text-lg">Fee Status Distribution</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Paid versus Pending structural balance</p>
           </div>
           <div className="flex-1">
             <PieChartWidget 
                data={charts.feeStatus} 
                colors={["#10b981", "#f43f5e"]}
             />
           </div>
        </div>
      </div>

    </div>
  );
}
