"use client";

import Link from "next/link";
import { LayoutGrid, BookOpen, FileText, TrendingUp, Wallet } from "lucide-react";

const navItems = [
  { href: "/accounting", label: "Overview", icon: Wallet },
  { href: "/accounting/ledger", label: "Ledger", icon: BookOpen },
  { href: "/accounting/expenses", label: "Expenses", icon: LayoutGrid },
  { href: "/accounting/reports", label: "Reports", icon: TrendingUp },
];

export function AccountingNav() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="apple-card group p-5 transition">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{item.label}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Manage {item.label.toLowerCase()} and run reports</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-300">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
