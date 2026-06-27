import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT_STYLES: Record<AlertVariant, string> = {
  info:    "border-slate-400/25 bg-slate-400/[0.04]",
  success: "border-emerald-400/30 bg-emerald-400/[0.04]",
  warning: "border-amber-400/35 bg-amber-400/[0.06]",
  error:   "border-ruby-400/30 bg-ruby-400/[0.04]",
};

const ICON_STYLES: Record<AlertVariant, string> = {
  info:    "text-slate-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error:   "text-ruby-400",
};

const TITLE_STYLES: Record<AlertVariant, string> = {
  info:    "text-slate-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  error:   "text-ruby-300",
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
    const Icon = DEFAULT_ICONS[variant];
    const resolvedIcon = icon ?? <Icon className={cn("h-4 w-4 shrink-0", ICON_STYLES[variant])} aria-hidden="true" />;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "rounded-xl border px-4 py-3.5",
          VARIANT_STYLES[variant],
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <div className="mt-0.5">{resolvedIcon}</div>
          <div className="flex-1 min-w-0">
            {title && (
              <p className={cn("text-xs font-bold uppercase tracking-label mb-1", TITLE_STYLES[variant])}>
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
