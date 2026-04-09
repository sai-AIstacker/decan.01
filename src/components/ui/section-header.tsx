import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  icon?: React.ElementType;
  className?: string;
}

export function SectionHeader({ title, subtitle, href, hrefLabel = "View all", icon: Icon, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[var(--muted-foreground)] shrink-0" />}
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
          {subtitle && <p className="label-xs mt-0">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="btn-ghost flex items-center gap-1 text-[11px]">
          {hrefLabel} <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}
