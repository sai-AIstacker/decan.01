"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface CalendarEvent { date: string; label: string; color?: "blue"|"green"|"red"|"amber"|"purple"; }

interface MiniCalendarProps { events?: CalendarEvent[]; onDateClick?: (date: string) => void; }

export function MiniCalendar({ events = [], onDateClick }: MiniCalendarProps) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay    = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Sun=6, Mon=0, Tue=1...
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const prev = () => month === 0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const next = () => month === 11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1);

  const eventMap: Record<string, CalendarEvent[]> = {};
  events.forEach(e => { if (!eventMap[e.date]) eventMap[e.date] = []; eventMap[e.date].push(e); });

  const colorDot: Record<string, string> = {
    blue: "bg-[#007aff]", green: "bg-[#34c759]", red: "bg-[#ff3b30]",
    amber: "bg-[#ff9f0a]", purple: "bg-[#bf5af2]",
  };

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[14px] font-bold text-[var(--foreground)] tracking-tight">
          {MONTHS[month]} {year}
        </span>
        <button onClick={next} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className={`text-center text-[10px] font-bold py-1 ${d === "Sat" || d === "Sun" ? "text-[#ff3b30]" : "text-[var(--muted-foreground)]"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day  = i + 1;
          const dow  = (startOffset + i) % 7; // 0=Mon, 5=Sat, 6=Sun
          const ds   = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday   = ds === todayStr;
          const isWeekend = dow === 5 || dow === 6;
          const dayEvents = eventMap[ds] || [];

          return (
            <button key={day} type="button"
              onClick={() => onDateClick?.(ds)}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1 rounded-[8px] min-h-[36px] transition-all duration-100 group
                ${isToday
                  ? "bg-[#1d1d1f] text-white"
                  : isWeekend
                  ? "text-[#ff3b30] hover:bg-[var(--surface-2)]"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                }`}>
              <span className={`text-[12px] font-semibold leading-none ${isToday ? "text-white" : ""}`}>{day}</span>
              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <span key={ei} className={`w-1 h-1 rounded-full ${isToday ? "bg-white/70" : colorDot[ev.color || "blue"]}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
