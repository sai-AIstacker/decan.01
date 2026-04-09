"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Save, Edit3, MessageSquare } from "lucide-react";
import type { EmailTemplateRow } from "@/types/database";

export default function TemplatesView() {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form State
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTemplates() {
    const { data } = await supabase.from("email_templates").select("*").order("name", { ascending: true });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const startEdit = (t: EmailTemplateRow) => {
     setEditingId(t.id);
     setEditSubject(t.subject);
     setEditBody(t.body);
  };

  const cancelEdit = () => {
     setEditingId(null);
     setEditSubject("");
     setEditBody("");
  };

  const saveEdit = async (id: string) => {
     if (!editSubject.trim() || !editBody.trim()) return;
     
     // Optimistic update
     setTemplates(prev => prev.map(t => t.id === id ? { ...t, subject: editSubject, body: editBody } : t));
     const prevId = editingId;
     cancelEdit();

     const { error } = await supabase.from("email_templates").update({ subject: editSubject, body: editBody }).eq("id", id);
     if (error) {
        console.error(error);
        await fetchTemplates(); // re-fetch on fail entirely
     }
  };

  if (loading) return <div className="p-12 text-center text-zinc-500">Loading Textual Bindings...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Notification Templates
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Govern dynamic keyword injections evaluating communication events.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {templates.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 col-span-2">No templates configured within the boundaries.</div>
         ) : (
            templates.map(t => (
               <div key={t.id} className="apple-card flex flex-col">
                  {editingId === t.id ? (
                     <div className="space-y-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                           <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.name}</span>
                        </div>
                        <div>
                           <Label className="text-xs">Email Header (Subject)</Label>
                           <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="mt-1 h-8 text-sm" />
                        </div>
                        <div className="flex-1">
                           <Label className="text-xs">Primary Injection (Body)</Label>
                           <textarea 
                              value={editBody} 
                              onChange={e => setEditBody(e.target.value)} 
                              className="w-full mt-1 min-h-[120px] rounded-md border border-zinc-200 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950" 
                           />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                           <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                           <Button size="sm" onClick={() => saveEdit(t.id)} className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white"><Save className="w-4 h-4 mr-1.5"/> Save Template</Button>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                           <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded">{t.name}</span>
                           <button onClick={() => startEdit(t)} className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
                              <Edit3 className="w-4 h-4" />
                           </button>
                        </div>
                        <div>
                           <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Subject Vector</h4>
                           <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.subject}</p>
                        </div>
                        <div className="flex-1">
                           <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Textual Payload</h4>
                           <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                        </div>
                     </div>
                  )}
               </div>
            ))
         )}
      </div>
    </div>
  );
}
