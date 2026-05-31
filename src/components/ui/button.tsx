"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "ruby";
  size?: "sm" | "md" | "lg";
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
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Primary: gold
            "bg-gold-400 text-midnight hover:bg-gold-300 active:bg-gold-500 shadow-lg shadow-gold-400/20":
              variant === "primary",
            // Secondary: ghost with gold border
            "border border-gold-400/40 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400":
              variant === "secondary",
            // Ghost: transparent
            "text-cream hover:bg-white/10": variant === "ghost",
            // Destructive: subtle red
            "bg-red-600 text-white hover:bg-red-500": variant === "destructive",
            // Ruby: CTA accent
            "bg-ruby-400 text-white hover:bg-ruby-300 active:bg-ruby-500 shadow-lg shadow-ruby-400/20":
              variant === "ruby",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-5 py-2.5 text-sm": size === "md",
            "px-7 py-3.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
