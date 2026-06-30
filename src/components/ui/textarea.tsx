"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-sm",
            "border-white/[0.08] bg-[#0B0E14]/85 text-cream",
            "placeholder:text-slate-500",
            "resize-none leading-relaxed",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2",
            "focus:border-gold-400/50 focus:ring-gold-400/[0.10]",
            "focus:shadow-[0_0_20px_-4px_rgba(212,160,23,0.18)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && [
              "border-ruby-400/50 focus:border-ruby-400/70",
              "focus:ring-ruby-400/[0.12] focus:shadow-[0_0_20px_-4px_rgba(193,39,45,0.20)]",
            ],
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";

export { Textarea };
