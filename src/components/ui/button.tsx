"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "xl";
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
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080806]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.97] motion-reduce:active:scale-100",

          variant === "primary" && [
            "rounded-xl bg-gold-400 text-midnight",
            "hover:bg-gold-300",
            "shadow-[0_8px_24px_-8px_rgba(212,160,23,0.40)]",
            "hover:shadow-[0_12px_32px_-8px_rgba(212,160,23,0.55)]",
          ],
          variant === "secondary" && [
            "rounded-xl border border-gold-400/30 text-gold-300",
            "hover:bg-gold-400/8 hover:border-gold-400/55 hover:text-gold-200",
          ],
          variant === "ghost" && [
            "rounded-xl text-cream",
            "hover:bg-white/8 hover:text-white",
          ],
          variant === "destructive" && [
            "rounded-xl bg-ruby-400 text-white",
            "hover:bg-ruby-300",
            "shadow-[0_8px_24px_-8px_rgba(193,39,45,0.35)]",
            "hover:shadow-[0_12px_32px_-8px_rgba(193,39,45,0.50)]",
          ],
          variant === "link" && [
            "rounded-none text-gold-400 underline-offset-4",
            "hover:underline hover:text-gold-300",
          ],

          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-5 py-2.5 text-sm",
          size === "lg" && "px-7 py-3.5 text-sm",
          size === "xl" && "px-8 py-4 text-base",

          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
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
