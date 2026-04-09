import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

export default async function ClassesPage() {
  const { profile } = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.roles.includes("admin") || profile.roles.includes("app_config")) {
    redirect("/admin/classes");
  }

  const supabase = await createClient();
  let rows: Array<{ id: string; name: string; section: string }> = [];

  if (profile.roles.includes("teacher")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Missing Supabase admin credentials");
    }
    const admin = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: homeroomClasses } = await admin
      .from("classes")
      .select("id, name, section")
      .eq("class_teacher_id", profile.id)
      .order("name", { ascending: true });

    const { data: subjectClassLinks } = await admin
      .from("class_subjects")
      .select("classes!inner(id, name, section)")
      .eq("teacher_id", profile.id);

    const subjectClasses =
      (subjectClassLinks || [])
        .map((r: any) => (Array.isArray(r.classes) ? r.classes[0] : r.classes))
        .filter(Boolean) || [];

    const combined = [...(homeroomClasses || []), ...subjectClasses];
    rows = Array.from(new Map(combined.map((r) => [r.id, r])).values());
  } else if (profile.roles.includes("student")) {
    const { data } = await supabase
      .from("enrollments")
      .select("classes(id, name, section)")
      .eq("student_id", profile.id)
      .eq("status", "active");
    rows =
      (data || [])
        .map((r: any) => (Array.isArray(r.classes) ? r.classes[0] : r.classes))
        .filter(Boolean) || [];
  } else if (profile.roles.includes("parent")) {
    const { data: links } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", profile.id);
    const studentIds = links?.map((l) => l.student_id) || [];
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from("enrollments")
        .select("classes(id, name, section)")
        .in("student_id", studentIds)
        .eq("status", "active");
      const mapped =
        (data || [])
          .map((r: any) => (Array.isArray(r.classes) ? r.classes[0] : r.classes))
          .filter(Boolean) || [];
      rows = Array.from(new Map(mapped.map((r: any) => [r.id, r])).values());
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Classes</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Classes available for your current role.
        </p>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes found"
          description="No class is assigned yet for your account."
        />
      ) : (
        <div className="apple-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.section}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
