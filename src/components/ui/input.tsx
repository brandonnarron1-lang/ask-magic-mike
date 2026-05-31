"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "dark" | "light";
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "dark", error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-400/60">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border px-4 py-3 text-sm transition-colors",
            "placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-gold-400/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            {
              "bg-white/5 border-white/10 text-cream focus:border-gold-400/50":
                variant === "dark",
              "bg-white border-gray-200 text-gray-900 focus:border-gold-400":
                variant === "light",
            },
            error && "border-red-500 focus:ring-red-500/50",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
