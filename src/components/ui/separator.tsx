import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gold" | "strong";
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  variant = "default",
  orientation = "horizontal",
  className,
  ...props
}: SeparatorProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          "w-px self-stretch",
          variant === "default" && "bg-white/[0.06]",
          variant === "gold" && "bg-gold-400/20",
          variant === "strong" && "bg-white/[0.12]",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        "h-px w-full",
        variant === "default" && "bg-white/[0.06]",
        variant === "gold" && "bg-gradient-to-r from-transparent via-gold-400/40 to-transparent",
        variant === "strong" && "bg-white/[0.12]",
        className
      )}
      {...props}
    />
  );
}

export function GoldRule({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("gold-rule", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
