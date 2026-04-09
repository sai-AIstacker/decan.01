"use client";

import { useEffect } from "react";

/**
 * Listens for sidebar collapse/expand events and updates
 * the main element's padding via a CSS class on <html>.
 */
export function SidebarStateSync() {
  useEffect(() => {
    const onCollapse = (e: Event) => {
      const collapsed = (e as CustomEvent).detail?.collapsed;
      if (collapsed) {
        document.documentElement.classList.add("sidebar-collapsed");
      } else {
        document.documentElement.classList.remove("sidebar-collapsed");
      }
    };
    window.addEventListener("sidebar-collapse-change", onCollapse);
    return () => window.removeEventListener("sidebar-collapse-change", onCollapse);
  }, []);

  return null;
}
