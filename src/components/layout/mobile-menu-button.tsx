"use client";

import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function MobileMenuButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for sidebar close events (e.g. nav click closes it)
  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  // Also close when sidebar closes itself (route change)
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("sidebar-closed", handler);
    return () => window.removeEventListener("sidebar-closed", handler);
  }, []);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
    setIsOpen(prev => !prev);
  };

  return (
    <button
      onClick={toggle}
      className="lg:hidden flex items-center justify-center w-10 h-10 rounded-[10px] hover:bg-[var(--surface-2)] transition-colors text-[var(--foreground)]"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
}
