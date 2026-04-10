import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./ui/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f5f5f7] flex flex-col px-5 py-8">

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-[var(--border)] shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-10">

          {/* Brand & Identity — Moved to the very top and made more prominent */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 rounded-[20px] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center shrink-0 border border-[var(--border)] mb-4 shadow-sm">
              <img src="/ssvm-logo.png" alt="Decan School" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-[24px] font-bold text-[var(--foreground)] tracking-tight">
              Decan School
            </h1>
            <p className="text-[13px] text-[var(--muted-foreground)] font-medium mt-1">
              Unified School Platform
            </p>
          </div>

          <LoginForm />

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--muted-foreground)] text-center leading-relaxed">
              Don't have credentials? Contact your school administrator.<br />
              <span className="font-semibold text-[var(--foreground)]">No self-registration available.</span>
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
