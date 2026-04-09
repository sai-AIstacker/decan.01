"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTablePaginated, Column } from "@/components/ui/data-table-paginated";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Subject = { id: string; name: string; code: string; description: string | null };

export default function SubjectsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  const fetchData = useCallback(async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
    const res = await fetch(`/api/admin/subjects?${params}`);
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  }, [refreshKey]); // eslint-disable-line

  const columns: Column<Subject>[] = [
    { header: "Code", cell: r => <span className="font-mono font-bold text-[13px] text-[var(--foreground)]">{r.code}</span> },
    { header: "Name", cell: r => <span className="font-semibold">{r.name}</span> },
    { header: "Description", cell: r => <span className="text-[var(--muted-foreground)]">{r.description || "—"}</span> },
    {
      header: "Actions", className: "text-right",
      cell: r => (
        <button onClick={async () => {
          if (!confirm(`Remove "${r.name}"?`)) return;
          const { error } = await supabase.from("subjects").delete().eq("id", r.id);
          if (error) toast.error(error.message);
          else { setRefreshKey(k => k + 1); toast.success(`"${r.name}" removed.`); }
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
    const code = (fd.get("code") as string)?.trim().toUpperCase();
    const description = fd.get("description") as string;
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Required";
    if (!code) errs.code = "Required";
    else if (!/^[A-Z0-9\-]+$/.test(code)) errs.code = "Alphanumeric only (e.g. MATH-101)";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("subjects").insert({ name, code, description });
      if (error) { if (error.code === "23505") toast.error(`Code "${code}" already exists.`); else throw error; return; }
      setRefreshKey(k => k + 1);
      setIsOpen(false);
      setFieldErrors({});
      toast.success(`Subject "${name}" created.`);
      (e.target as HTMLFormElement).reset();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end p-4 apple-card">
        <Dialog open={isOpen} onOpenChange={o => { setIsOpen(o); if (!o) setFieldErrors({}); }}>
          <DialogTrigger asChild>
            <button style={{ background: "#1d1d1f", color: "#fff", border: "2px solid #1d1d1f", borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <Plus size={14} /> Add Subject
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Subject</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label>Subject Name</Label>
                <Input name="name" placeholder="e.g. Mathematics" required disabled={isSubmitting} className={fieldErrors.name ? "border-rose-400" : ""} />
                {fieldErrors.name && <p className="text-[11px] text-rose-500">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label>Subject Code</Label>
                <Input name="code" placeholder="e.g. MATH-101" required disabled={isSubmitting} className={fieldErrors.code ? "border-rose-400" : ""} />
                {fieldErrors.code && <p className="text-[11px] text-rose-500">{fieldErrors.code}</p>}
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Input name="description" placeholder="Brief description" disabled={isSubmitting} />
              </div>
              <button type="submit" disabled={isSubmitting}
                style={{ width: "100%", height: 44, background: "#1d1d1f", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Creating…" : "Create Subject"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTablePaginated<Subject>
        columns={columns}
        fetchData={fetchData}
        pageSize={15}
        searchPlaceholder="Search subjects…"
        emptyMessage="No subjects yet."
        rowKey={r => r.id}
      />
    </div>
  );
}
