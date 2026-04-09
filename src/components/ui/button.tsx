import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — neo-brutalist Apple hybrid
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-bold tracking-tight select-none cursor-pointer",
    "border-2 border-[#0a0a0a] dark:border-[rgba(255,255,255,0.15)]",
    "transition-all duration-[130ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)]",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:translate-x-[2px] active:translate-y-[2px]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Black — primary action
        default: [
          "bg-[#0a0a0a] text-white",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
          "dark:bg-[#f5f5f7] dark:text-[#0a0a0a] dark:border-[#f5f5f7]",
          "dark:shadow-[3px_3px_0px_rgba(245,245,247,0.3)]",
          "dark:hover:shadow-[4px_4px_0px_rgba(245,245,247,0.3)]",
        ].join(" "),
        // Blue — iOS blue
        blue: [
          "bg-[#007aff] text-white",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
        ].join(" "),
        // Green — success / confirm
        success: [
          "bg-[#34c759] text-white",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
        ].join(" "),
        // Red — destructive
        destructive: [
          "bg-[#ff3b30] text-white",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
        ].join(" "),
        // Amber — warning
        warning: [
          "bg-[#ff9f0a] text-[#0a0a0a]",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
        ].join(" "),
        // Purple — premium
        purple: [
          "bg-[#bf5af2] text-white",
          "shadow-[3px_3px_0px_#0a0a0a]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#0a0a0a]",
          "active:shadow-[1px_1px_0px_#0a0a0a]",
        ].join(" "),
        // Outline — secondary
        outline: [
          "bg-[var(--surface-1)] text-[var(--foreground)]",
          "border-[var(--border)] dark:border-[rgba(255,255,255,0.15)]",
          "shadow-[2px_2px_0px_var(--border)]",
          "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_var(--border)] hover:bg-[var(--surface-2)]",
          "active:shadow-[1px_1px_0px_var(--border)]",
        ].join(" "),
        // Ghost — minimal
        ghost: [
          "bg-transparent text-[var(--muted-foreground)] border-transparent shadow-none",
          "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "active:translate-x-0 active:translate-y-0",
        ].join(" "),
        // Link
        link: "bg-transparent border-transparent shadow-none text-[var(--foreground)] underline-offset-4 hover:underline active:translate-x-0 active:translate-y-0",
      },
      size: {
        xs:      "h-7 px-3 text-[11px] rounded-[10px]",
        sm:      "h-8 px-4 text-[12px] rounded-[11px]",
        default: "h-10 px-5 text-[13px] rounded-[13px]",
        lg:      "h-12 px-7 text-[15px] rounded-[14px]",
        xl:      "h-14 px-9 text-[16px] rounded-[16px]",
        icon:    "h-10 w-10 rounded-[13px]",
        "icon-sm": "h-8 w-8 rounded-[10px]",
        "icon-lg": "h-12 w-12 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
