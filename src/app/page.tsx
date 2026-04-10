import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, BarChart3, BookOpen, Users } from "lucide-react";
import { BookDemoButton } from "@/components/book-demo/book-demo-button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex items-center gap-2.5 mb-10">
        <img src="/ssvm-logo.png" alt="Decan School" className="w-9 h-9 rounded-[10px] object-contain" />
        <span className="text-[15px] font-semibold text-[var(--foreground)]">Decan School</span>
      </div>

      <h1 className="max-w-2xl text-[40px] font-bold tracking-tight text-[var(--foreground)] leading-tight">
        Run your entire school on one modern platform.
      </h1>
      <p className="mt-4 max-w-lg text-[14px] text-[var(--muted-foreground)] leading-relaxed">
        Academics, attendance, exams, finance, HR, and communication — all in one high security, role-based system built for schools.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/login" className="btn-primary px-8 py-3 text-[14px] rounded-[12px] flex items-center gap-2">
          <span className="text-[15px] font-bold leading-none">@</span>
          Sign In
        </Link>
        <BookDemoButton />
      </div>

      <div className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-4 text-left">
        {[
          { icon: Users, label: "Role-based dashboards", desc: "Admin, teacher, student, parent, HR, accounting portals." },
          { icon: ShieldCheck, label: "High Security", desc: "Enterprise-grade auth with database-level row security." },
          { icon: BarChart3, label: "Live analytics", desc: "Real-time KPIs and charts for every role." },
          { icon: BookOpen, label: "Full academics", desc: "Classes, exams, results, timetables and more." },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="apple-card p-4">
              <div className="w-7 h-7 rounded-[8px] bg-[var(--surface-2)] flex items-center justify-center mb-2.5">
                <Icon size={14} className="text-[var(--foreground)]" />
              </div>
              <p className="text-[12px] font-semibold text-[var(--foreground)]">{item.label}</p>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-snug">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-[11px] text-[var(--muted-foreground)]">
        No self-registration. Accounts are created by your school administrator.
      </p>
    </main>
  );
}
