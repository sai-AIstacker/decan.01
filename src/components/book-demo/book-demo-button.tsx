"use client";

import { useState } from "react";
import { BookDemoModal } from "./book-demo-modal";
import { Phone } from "lucide-react";

export function BookDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary px-8 py-3 text-[14px] rounded-[12px] flex items-center gap-2"
      >
        <Phone size={14} className="shrink-0" />
        Book Demo
      </button>
      <BookDemoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
