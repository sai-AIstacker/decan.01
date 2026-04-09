"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Building2, LayoutTemplate } from "lucide-react";
import type { AppSettingsRow } from "@/types/database";

export default function SettingsView() {
  const [settings, setSettings] = useState<Partial<AppSettingsRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("app_settings").select("*").eq("is_singleton", true).single();
    if (data) setSettings(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let logoUrl = settings.school_logo;

      // Process explicit file upload bypassing memory bounds
      if (logoFile) {
         const fileExt = logoFile.name.split('.').pop();
         const fileName = `logo-${Date.now()}.${fileExt}`;
         
         const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("school_assets")
            .upload(fileName, logoFile, { upsert: true });

         if (uploadErr) throw new Error("Image Upload Error: " + uploadErr.message);

         logoUrl = uploadData.path;
      }

      // Sync database payload exclusively protecting singleton
      const { error: dbErr } = await supabase
         .from("app_settings")
         .update({
            school_name: settings.school_name,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            address: settings.address,
            timezone: settings.timezone,
            school_logo: logoUrl
         })
         .eq("is_singleton", true);

      if (dbErr) throw new Error(dbErr.message);

      setSuccessMsg("System configuration forcefully synchronized successfully.");
      setLogoFile(null); // Clear holding file
      await fetchSettings(); // Re-sync

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit parameters.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-zinc-500">Loading Configuration Parameters...</div>;

  const publicUrl = settings.school_logo ? supabase.storage.from("school_assets").getPublicUrl(settings.school_logo).data.publicUrl : '';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Organizational Variables
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Modify core entity branding, communication thresholds, and locale specifications securely.
        </p>
      </div>

      {errorMsg && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-200">{errorMsg}</div>}
      {successMsg && <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-200">{successMsg}</div>}

      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-2">
         {/* Branding Block */}
         <div className="md:col-span-2 apple-card">
            <h3 className="font-semibold text-lg flex items-center mb-6">
              <LayoutTemplate className="w-5 h-5 mr-2 text-zinc-700 dark:text-zinc-300" /> Organizational Identity
            </h3>

            <div className="flex flex-col md:flex-row gap-8 items-start">
               {/* Logo Preview */}
               <div className="shrink-0 flex flex-col items-center gap-3">
                 <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                    {logoFile ? (
                       <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain" alt="preview" />
                    ) : publicUrl ? (
                       <img src={publicUrl} className="w-full h-full object-contain" alt="Current Logo" />
                    ) : (
                       <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                    )}
                 </div>
                 <Label htmlFor="logoUpload" className="cursor-pointer text-xs font-medium px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors">
                    Upload Identity Vector
                 </Label>
                 <input 
                    id="logoUpload" 
                    type="file" 
                    accept="image/png, image/jpeg, image/svg+xml" 
                    className="hidden" 
                    onChange={e => setLogoFile(e.target.files?.[0] || null)}
                 />
               </div>

               <div className="flex-1 w-full space-y-4">
                 <div>
                   <Label className="text-zinc-600 dark:text-zinc-400">Official Organization Name</Label>
                   <Input 
                     value={settings.school_name || ""}
                     onChange={e => setSettings({...settings, school_name: e.target.value})}
                     className="mt-1 bg-white dark:bg-zinc-950" 
                     required
                   />
                 </div>
                 <div>
                   <Label className="text-zinc-600 dark:text-zinc-400">Active Localization Target</Label>
                   <select 
                     value={settings.timezone || "UTC"}
                     onChange={e => setSettings({...settings, timezone: e.target.value})}
                     className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                   >
                      <option value="UTC">Universal Coordinated Time (UTC)</option>
                      <option value="America/New_York">Eastern Time (America/New_York)</option>
                      <option value="Asia/Calcutta">India Standard (Asia/Calcutta)</option>
                      <option value="Europe/London">London Time (Europe/London)</option>
                   </select>
                 </div>
               </div>
            </div>
         </div>

         {/* Contact & Legal */}
         <div className="md:col-span-2 apple-card">
            <h3 className="font-semibold text-lg flex items-center mb-6">
              <Building2 className="w-5 h-5 mr-2 text-zinc-700 dark:text-zinc-300" /> Operational Endpoints
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
               <div>
                 <Label className="text-zinc-600 dark:text-zinc-400">Communication Terminal (Email)</Label>
                 <Input 
                   type="email"
                   value={settings.contact_email || ""}
                   onChange={e => setSettings({...settings, contact_email: e.target.value})}
                   className="mt-1 bg-white dark:bg-zinc-950" 
                 />
               </div>
               <div>
                 <Label className="text-zinc-600 dark:text-zinc-400">Telecom Anchor (Phone)</Label>
                 <Input 
                   type="tel"
                   value={settings.contact_phone || ""}
                   onChange={e => setSettings({...settings, contact_phone: e.target.value})}
                   className="mt-1 bg-white dark:bg-zinc-950" 
                 />
               </div>
               <div className="md:col-span-2">
                 <Label className="text-zinc-600 dark:text-zinc-400">Physical Logistics Anchor (Address)</Label>
                 <Input 
                   value={settings.address || ""}
                   onChange={e => setSettings({...settings, address: e.target.value})}
                   className="mt-1 bg-white dark:bg-zinc-950" 
                 />
               </div>
            </div>
         </div>

         <div className="md:col-span-2 flex justify-end">
            <Button disabled={saving} type="submit" className="rounded-xl px-8 bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-md shadow-indigo-600/20">
               <Save className="w-4 h-4 mr-2" />
               {saving ? "Persisting Boundaries..." : "Commit Infrastructure Mutators"}
            </Button>
         </div>
      </form>
    </div>
  );
}
