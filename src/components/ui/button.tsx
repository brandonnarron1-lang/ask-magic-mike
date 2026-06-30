"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link" | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080806]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",

          variant === "primary" && [
            "btn-gold-premium",
            "rounded-xl text-[#050505]",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          ],
          variant === "secondary" && [
            "rounded-xl border border-gold-400/25 text-gold-300 bg-gold-400/[0.04]",
            "hover:bg-gold-400/[0.09] hover:border-gold-400/45 hover:text-gold-200",
            "transition-all duration-200",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          ],
          variant === "outline" && [
            "rounded-xl border border-white/[0.12] text-cream bg-transparent",
            "hover:border-white/[0.22] hover:bg-white/[0.04]",
            "transition-all duration-200",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          ],
          variant === "ghost" && [
            "rounded-xl text-slate-300",
            "hover:text-cream hover:bg-white/[0.06]",
            "transition-all duration-150",
          ],
          variant === "destructive" && [
            "rounded-xl text-white",
            "bg-ruby-400 hover:bg-ruby-300",
            "shadow-[0_8px_24px_-8px_rgba(193,39,45,0.35)] hover:shadow-[0_12px_32px_-8px_rgba(193,39,45,0.50)]",
            "transition-all duration-200",
            "active:scale-[0.97] motion-reduce:active:scale-100",
          ],
          variant === "link" && [
            "rounded-none text-gold-400 underline-offset-4 h-auto p-0",
            "hover:underline hover:text-gold-300",
            "transition-colors duration-150",
          ],

          size === "xs" && "px-2.5 py-1 text-[11px] tracking-wide",
          size === "sm" && "px-3.5 py-2 text-xs",
          size === "md" && "px-5 py-2.5 text-sm",
          size === "lg" && "px-7 py-3.5 text-sm",
          size === "xl" && "px-9 py-4 text-base",

          variant === "link" && "!p-0",

          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
