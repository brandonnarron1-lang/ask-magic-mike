import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "inset" | "gold" | "command" | "ambient";
  accent?: "gold" | "ruby" | "cyan" | "emerald" | "amber" | "none";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", accent = "none", ...props }, ref) => {
    const accentRim: Record<typeof accent, string> = {
      gold:    "via-gold-400/40",
      ruby:    "via-ruby-400/35",
      cyan:    "via-cyan-400/30",
      emerald: "via-emerald-400/30",
      amber:   "via-amber-400/30",
      none:    "via-white/[0.08]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl overflow-hidden",

          variant === "default" && [
            "border border-white/[0.06] bg-white/[0.02]",
            "transition-all duration-200",
          ],
          variant === "glass" && [
            "border border-white/[0.08] bg-[#0D0B07]/80 backdrop-blur-md",
            "shadow-[0_24px_60px_-32px_rgba(0,0,0,0.70)]",
            "transition-all duration-200",
          ],
          variant === "elevated" && [
            "border border-white/[0.09] bg-[#0D0B07]",
            "shadow-[0_32px_80px_-24px_rgba(0,0,0,0.80),0_0_0_1px_rgba(212,160,23,0.05)]",
          ],
          variant === "inset" && [
            "border border-white/[0.04] bg-white/[0.01]",
          ],
          variant === "gold" && [
            "glass-gold-card",
            "transition-all duration-200",
          ],
          variant === "command" && [
            "border border-white/[0.07] bg-[#0D0D0D]/60 backdrop-blur-[2px]",
            "transition-all duration-250",
            "hover:border-white/[0.12] hover:-translate-y-0.5",
            "hover:shadow-[0_8px_24px_rgba(0,0,0,0.55)]",
          ],
          variant === "ambient" && [
            "border border-white/[0.07] bg-[#0C0C0C]/75 backdrop-blur-sm",
            "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.05)]",
          ],

          className
        )}
        {...props}
      >
        {/* Top rim gradient — always present */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
            accentRim[accent]
          )}
        />
        {props.children}
      </div>
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-base font-semibold text-cream leading-none", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-400 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0 border-t border-white/[0.05] mt-4",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
