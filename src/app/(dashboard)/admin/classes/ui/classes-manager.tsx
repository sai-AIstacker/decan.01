"use client";

import { useState, useCallback } from "react";
import { createClassAdminAction, deleteClassAdminAction, toggleClassActiveAdminAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTablePaginated, Column } from "@/components/ui/data-table-paginated";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ClassRow = { id: string; name: string; section: string; is_active: boolean; academic_years: { name: string } | null; profiles: { full_name: string } | null; };

export default function ClassesManager({ academicYears, teachers }: { academicYears: any[]; teachers: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const selectedDefaultYear = academicYears.find(y => y.is_active) || academicYears[0] || null;

  const fetchData = useCallback(async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
    const res = await fetch(`/api/admin/classes?${params}`);
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  }, [refreshKey]); // eslint-disable-line

  const columns: Column<ClassRow>[] = [
    { header: "Class", cell: r => <span className="font-semibold text-[var(--foreground)]">{r.name}</span> },
    { header: "Section", cell: r => <span className="text-[var(--muted-foreground)]">{r.section}</span> },
    { header: "Academic Year", cell: r => <span>{r.academic_years?.name || "—"}</span> },
    { header: "Teacher", cell: r => <span>{r.profiles?.full_name || <span className="text-[var(--muted-foreground)] italic">Unassigned</span>}</span> },
    {
      header: "Status",
      cell: r => (
        <button onClick={async () => {
          try { await toggleClassActiveAdminAction(r.id, !r.is_active); setRefreshKey(k => k + 1); router.refresh(); toast.success(r.is_active ? "Deactivated" : "Activated"); }
          catch (e: any) { toast.error(e.message); }
        }} className={`px-3 py-1 rounded-full text-[11px] font-bold border-2 transition-all ${r.is_active ? "bg-[#1d1d1f] border-[#1d1d1f] text-white" : "bg-white border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          {r.is_active ? "Active" : "Inactive"}
        </button>
      )
    },
    {
      header: "Actions", className: "text-right",
      cell: r => (
        <button onClick={async () => {
          if (!confirm(`Remove "${r.name} ${r.section}"?`)) return;
          try { await deleteClassAdminAction(r.id); setRefreshKey(k => k + 1); router.refresh(); toast.success("Class removed."); }
          catch (e: any) { toast.error(e.message); }
        }} className="p-2 rounded-[8px] text-[#ff3b30] hover:bg-[#ff3b30]/8 transition-colors">
          <Trash2 size={14} />
        </button>
      )
    },
  ];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const section = (fd.get("section") as string)?.trim();
    const academic_year_id = (fd.get("academic_year_id") as string)?.trim();
    const class_teacher_id = (fd.get("teacher_id") as string)?.trim();
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Required";
    if (!section) errs.section = "Required";
    if (!academic_year_id) errs.academic_year_id = "Required";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setIsSubmitting(true);
    try {
      await createClassAdminAction({ name, section, academicYearId: academic_year_id, classTeacherId: class_teacher_id || null });
      setRefreshKey(k => k + 1);
      router.refresh();
      setIsOpen(false);
      setFieldErrors({});
      toast.success(`Class "${name} ${section}" created.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 apple-card">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          Active Year: <strong className="text-[var(--foreground)]">{academicYears.find(y => y.is_active)?.name || "None"}</strong>
          {!academicYears.some(y => y.is_active) && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 text-[11px]"><AlertCircle size={12} /> Activate a year first</span>
          )}
        </p>
        <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) setFieldErrors({}); }}>
          <DialogTrigger asChild>
            <button disabled={academicYears.length === 0}
              style={{ background: "#1d1d1f", color: "#fff", border: "2px solid #1d1d1f", borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: academicYears.length === 0 ? 0.4 : 1 }}>
              <Plus size={14} /> Add Class
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Class</DialogTitle><DialogDescription>Create a class for the active academic year.</DialogDescription></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Class Name</Label>
                  <Input name="name" placeholder="e.g. Grade 10" required disabled={isSubmitting} className={fieldErrors.name ? "border-rose-400" : ""} />
                  {fieldErrors.name && <p className="text-[11px] text-rose-500">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Section</Label>
                  <Input name="section" placeholder="e.g. A" required disabled={isSubmitting} className={fieldErrors.section ? "border-rose-400" : ""} />
                  {fieldErrors.section && <p className="text-[11px] text-rose-500">{fieldErrors.section}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Academic Year</Label>
                <select name="academic_year_id" defaultValue={selectedDefaultYear?.id ?? ""} disabled={isSubmitting} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[13px] outline-none focus:border-[#1d1d1f]">
                  <option value="">Select year</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_active ? " (Active)" : ""}</option>)}
                </select>
                {fieldErrors.academic_year_id && <p className="text-[11px] text-rose-500">{fieldErrors.academic_year_id}</p>}
              </div>
              <div className="space-y-1">
                <Label>Homeroom Teacher</Label>
                <select name="teacher_id" disabled={isSubmitting} className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[13px] outline-none focus:border-[#1d1d1f]">
                  <option value="">Select teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isSubmitting}
                style={{ width: "100%", height: 44, background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Creating…" : "Create Class"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Paginated table */}
      <DataTablePaginated<ClassRow>
        columns={columns}
        fetchData={fetchData}
        pageSize={15}
        searchPlaceholder="Search classes…"
        emptyMessage="No classes yet. Create the first class above."
        rowKey={r => r.id}
      />
    </div>
  );
}
