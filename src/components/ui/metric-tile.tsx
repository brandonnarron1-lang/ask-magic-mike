import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface MetricTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  href?: string;
}

export function MetricTile({
  value,
  label,
  valueClassName,
  sublabel,
  className,
  children,
  ...props
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4",
        className
      )}
      {...props}
    >
      <div className={cn("font-bebas text-4xl leading-none", valueClassName)}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
        {label}
      </div>
      {sublabel && (
        <div className="text-[10px] text-slate-600 mt-0.5">{sublabel}</div>
      )}
      {children}
    </div>
  );
}

export interface MetricGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4 | 5;
}

export function MetricGrid({ cols = 4, className, children, ...props }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-2 sm:grid-cols-3",
        cols === 4 && "grid-cols-2 sm:grid-cols-4",
        cols === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
