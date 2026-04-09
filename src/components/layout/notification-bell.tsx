"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, BookOpen, DollarSign, Users, Settings, Inbox } from "lucide-react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationRow } from "@/types/database";

const typeConfig: Record<string, { icon: React.ElementType; color: string; dot: string }> = {
  academic: { icon: BookOpen, color: "text-blue-500 bg-zinc-900 dark:bg-zinc-100/10", dot: "bg-zinc-900 dark:bg-zinc-100" },
  finance: { icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10", dot: "bg-emerald-500" },
  hr: { icon: Users, color: "text-violet-500 bg-violet-500/10", dot: "bg-violet-500" },
  system: { icon: Settings, color: "text-zinc-500 bg-zinc-500/10", dot: "bg-zinc-400" },
  default: { icon: Bell, color: "text-zinc-700 dark:text-zinc-300 bg-[var(--surface-2)]", dot: "bg-zinc-900 dark:bg-zinc-100" },
};

function getType(n: NotificationRow): string {
  const t = (n as any).type || "";
  if (typeConfig[t]) return t;
  const title = (n.title || "").toLowerCase();
  if (title.includes("fee") || title.includes("payment") || title.includes("invoice")) return "finance";
  if (title.includes("exam") || title.includes("result") || title.includes("assignment") || title.includes("attendance")) return "academic";
  if (title.includes("leave") || title.includes("payroll") || title.includes("staff")) return "hr";
  return "default";
}

export function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Stable client ref — created once, reused across all renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      ]);
      if (data) setNotifications(data);
      setUnreadCount(count ?? 0);
    };
    load();
    const channel = supabase.channel("realtime_notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId!).eq("is_read", false);
  };

  if (!userId) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-950" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 rounded-2xl shadow-2xl overflow-hidden border-zinc-200/60 dark:border-white/[0.06] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-100/60 dark:border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-zinc-700 dark:text-zinc-300" />
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[11px] text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 hover:underline font-medium">
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox size={28} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">All caught up</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50 dark:divide-white/[0.03]">
              {notifications.map(n => {
                const type = getType(n);
                const cfg = typeConfig[type] || typeConfig.default;
                const Icon = cfg.icon;
                const inner = (
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${!n.is_read ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-600 dark:text-zinc-400"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-zinc-400 shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={(e) => markAsRead(n.id, e)}
                        className="shrink-0 w-5 h-5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-emerald-500 transition-colors">
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                );
                const cls = `block px-4 py-3 hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors ${!n.is_read ? "bg-[var(--surface-2)] dark:bg-[var(--surface-2)]" : ""}`;
                return (
                  <li key={n.id}>
                    {n.action_url ? <Link href={n.action_url} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100/60 dark:border-white/[0.04] p-2">
          <Link href="/notifications"
            className="block text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
