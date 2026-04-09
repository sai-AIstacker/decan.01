/**
 * useConfirm — a React hook that replaces browser confirm() with an
 * inline Sonner toast acting as a confirmation gate.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm("Delete this record?");
 *   if (!ok) return;
 */
"use client";

import { toast } from "sonner";

export function useConfirm() {
  return (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      toast(message, {
        duration: 10000,
        action: {
          label: "Confirm",
          onClick: () => resolve(true),
        },
        cancel: {
          label: "Cancel",
          onClick: () => resolve(false),
        },
        onDismiss: () => resolve(false),
        onAutoClose: () => resolve(false),
      });
    });
  };
}
