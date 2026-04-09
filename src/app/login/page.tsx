import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./ui/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f2f2f7] dark:bg-[#000] flex flex-col px-5 py-8">

      {/* Top brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#fce4ec] flex items-center justify-center shrink-0">
          <img src="/ssvm-logo.png" alt="Decan School" className="w-7 h-7 object-contain" />
        </div>
        <span className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">
          Decan School
        </span>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#1c1c1e] rounded-[20px] shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.4)] p-8">

          {/* Heading */}
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--foreground)] mb-1" style={{fontFamily:"var(--font-jakarta)"}}>
            Sign in
          </h1>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-7">
            Use the credentials provided by your administrator.
          </p>

          <LoginForm />

          {/* Footer */}
          <p className="mt-6 text-[13px] text-[var(--muted-foreground)] text-center leading-relaxed">
            Don't have credentials? Contact your school administrator.<br />
            Accounts are created by admin — no self-registration.
          </p>
        </div>
      </div>

    </main>
  );
}
