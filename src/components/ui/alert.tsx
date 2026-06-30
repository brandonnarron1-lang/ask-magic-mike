import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT_STYLES: Record<AlertVariant, {
  border: string;
  accent: string;
  bg: string;
  icon: string;
  title: string;
}> = {
  info: {
    border: "border-slate-700/60",
    accent: "border-l-slate-400",
    bg: "bg-slate-400/[0.03]",
    icon: "text-slate-400",
    title: "text-slate-300",
  },
  success: {
    border: "border-emerald-900/50",
    accent: "border-l-emerald-500",
    bg: "bg-emerald-500/[0.04]",
    icon: "text-emerald-400",
    title: "text-emerald-300",
  },
  warning: {
    border: "border-amber-900/50",
    accent: "border-l-amber-400",
    bg: "bg-amber-400/[0.05]",
    icon: "text-amber-400",
    title: "text-amber-300",
  },
  error: {
    border: "border-ruby-900/50",
    accent: "border-l-ruby-400",
    bg: "bg-ruby-400/[0.04]",
    icon: "text-ruby-400",
    title: "text-ruby-300",
  },
};

const DEFAULT_ICONS: Record<AlertVariant, React.ElementType> = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, icon, children, ...props }, ref) => {
    const s = VARIANT_STYLES[variant];
    const Icon = DEFAULT_ICONS[variant];
    const resolvedIcon = icon ?? (
      <Icon className={cn("h-4 w-4 shrink-0", s.icon)} aria-hidden="true" />
    );

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-xl border border-l-2 px-4 py-3.5",
          s.border,
          s.accent,
          s.bg,
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <div className="mt-0.5 shrink-0">{resolvedIcon}</div>
          <div className="flex-1 min-w-0">
            {title && (
              <p className={cn("text-xs font-bold uppercase tracking-label mb-1", s.title)}>
                {title}
              </p>
            )}
            {children && (
              <div className="text-sm text-slate-400 leading-relaxed">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { Alert };
