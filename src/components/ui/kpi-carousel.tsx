import { cn } from "@/lib/utils";

interface KPICarouselProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 6;
  className?: string;
}

export function KPICarousel({ children, cols = 6, className }: KPICarouselProps) {
  const gridCols: Record<number, string> = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    6: "lg:grid-cols-6",
  };

  return (
    <div className={cn(
      // Mobile: horizontal snap-scroll carousel with equal-width items
      "flex gap-3 overflow-x-auto scroll-smooth",
      "snap-x snap-mandatory",
      "-mx-4 px-4 lg:mx-0 lg:px-0",
      "scrollbar-none [&::-webkit-scrollbar]:hidden",
      "pb-1",
      // Desktop: CSS grid — equal columns, no scroll
      `lg:grid lg:gap-3 lg:overflow-visible lg:snap-none lg:flex-none ${gridCols[cols]}`,
      className
    )}>
      {children}
    </div>
  );
}
