import { getSessionProfile, isAdmin } from "@/lib/auth/profile";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSessionProfile();

  if (!profile || !isAdmin(profile.roles)) {
    // Explicit security hardening: Hard intercept rejecting unauthorized routes
    redirect("/dashboard");
  }

  return (
    <div className="w-full">
       {children}
    </div>
  );
}
