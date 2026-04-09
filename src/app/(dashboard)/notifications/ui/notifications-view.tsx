"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, CheckCircle2, Inbox, BookOpen, DollarSign, Users, Settings, Filter } from "lucide-react";
import Link from "next/link";
import type { NotificationRow } from "@/types/database";

type FilterType = "all" | "academic" | "finance" | "hr" | "system";

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; dot: string }> = {
  academic: { icon: BookOpen, label: "Academic", color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-zinc-900 dark:bg-zinc-100/10", dot: "bg-zinc-900 dark:bg-zinc-100" },
  finance: { icon: DollarSign, label: "Finance", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  hr: { icon: Users, label: "HR", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", dot: "bg-violet-500" },
  system: { icon: Settings, label: "System", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-500/10", dot: "bg-zinc-400" },
  default: { icon: Bell, label: "General", color: "text-zinc-900 dark:text-zinc-100 dark:text-zinc-300", bg: "bg-[var(--surface-2)]", dot: "bg-zinc-900 dark:bg-zinc-100" },
};

function detectType(n: NotificationRow): string {
  const t = (n as any).type || "";
  if (typeConfig[t]) return t;
  const title = (n.title || "").toLowerCase();
  if (title.includes("fee") || title.includes("payment") || title.includes("invoice")) return "finance";
  if (title.includes("exam") || title.includes("result") || title.includes("assignment") || title.includes("attendance")) return "academic";
  if (title.includes("leave") || title.includes("payroll") || title.includes("staff")) return "hr";
  return "default";
}

export default function NotificationsView({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  }

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  };

  const hasUnread = notifications.some(n => !n.is_read);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = filter === "all"
    ? notifications
    : notifications.filter(n => detectType(n) === filter);

  const filterTabs: { key: FilterType; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Bell },
    { key: "academic", label: "Academic", icon: BookOpen },
    { key: "finance", label: "Finance", icon: DollarSign },
    { key: "hr", label: "HR", icon: Users },
    { key: "system", label: "System", icon: Settings },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Notifications</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {hasUnread && (
          <button onClick={markAllAsRead}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 dark:text-zinc-300 bg-[var(--surface-2)] hover:bg-zinc-900 dark:bg-zinc-100/15 transition-colors">
            <CheckCircle2 size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-100/80 dark:bg-white/[0.04] w-fit">
        {filterTabs.map(tab => {
          const Icon = tab.icon;
          const count = tab.key === "all"
            ? notifications.filter(n => !n.is_read).length
            : notifications.filter(n => detectType(n) === tab.key && !n.is_read).length;
          return (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === tab.key
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}>
              <Icon size={12} />
              {tab.label}
              {count > 0 && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100/15 text-zinc-900 dark:text-zinc-100 dark:text-zinc-300">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      <div className="apple-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <Inbox size={40} className="text-zinc-200 dark:text-zinc-800 mb-3" />
            <p className="font-medium text-zinc-500 dark:text-zinc-400">Nothing here</p>
            <p className="text-sm text-zinc-400 mt-0.5">No {filter !== "all" ? filter : ""} notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50 dark:divide-white/[0.03]">
            {filtered.map(n => {
              const type = detectType(n);
              const cfg = typeConfig[type] || typeConfig.default;
              const Icon = cfg.icon;

              const inner = (
                <div className="flex gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`text-sm truncate ${!n.is_read ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-600 dark:text-zinc-400"}`}>
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 shrink-0 mt-0.5">
                        {new Date(n.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button onClick={(e) => markAsRead(n.id, e)}
                      className="shrink-0 w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-center text-zinc-300 hover:text-emerald-500 transition-colors"
                      title="Mark as read">
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </div>
              );

              const cls = `block px-5 py-4 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors ${!n.is_read ? "bg-zinc-100 dark:bg-zinc-800/20 dark:bg-zinc-900 dark:bg-zinc-100/[0.03]" : ""}`;

              return (
                <li key={n.id}>
                  {n.action_url ? <Link href={n.action_url} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
