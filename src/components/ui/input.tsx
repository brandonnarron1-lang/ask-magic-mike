"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "dark" | "light";
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "dark", error, icon, iconRight, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-400/55">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-sm",
            "placeholder:text-slate-500",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            iconRight && "pr-10",

            variant === "dark" && [
              "border-white/[0.08] bg-[#0B0E14]/85 text-cream",
              "focus:border-gold-400/50 focus:ring-gold-400/[0.10]",
              "focus:shadow-[0_0_20px_-4px_rgba(212,160,23,0.18)]",
            ],
            variant === "light" && [
              "border-gray-200 bg-white text-gray-900",
              "focus:border-gold-400 focus:ring-gold-400/30",
            ],

            error && [
              "border-ruby-400/50 focus:border-ruby-400/70",
              "focus:ring-ruby-400/[0.12] focus:shadow-[0_0_20px_-4px_rgba(193,39,45,0.20)]",
            ],

            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {iconRight}
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-ruby-400 flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-ruby-400 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
