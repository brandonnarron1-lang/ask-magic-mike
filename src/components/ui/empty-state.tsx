import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  heading: string;
  body?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  heading,
  body,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}
        >
          <span className={cn("text-slate-500", compact ? "h-5 w-5" : "h-6 w-6")}>
            {icon}
          </span>
        </div>
      )}
      <p
        className={cn(
          "font-semibold text-slate-300",
          compact ? "text-sm" : "text-base"
        )}
      >
        {heading}
      </p>
      {body && (
        <p className={cn("mt-1.5 text-slate-500 max-w-xs", compact ? "text-xs" : "text-sm")}>
          {body}
        </p>
      )}
      {action && <div className={cn(compact ? "mt-3" : "mt-5")}>{action}</div>}
    </div>
  );
}
