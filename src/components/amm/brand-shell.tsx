import { cn } from "@/lib/utils/cn";
import { MagicBackdrop } from "./magic-backdrop";

interface BrandShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: "hero" | "card";
  /** Set false on embed/iframe surfaces to avoid the bottom navy fade. */
  withBackdrop?: boolean;
}

/**
 * BrandShell — single root for every funnel surface (`/value`, `/ask`,
 * `/embed/ask`, confirmation). Owns the base palette, the restrained
 * ambient gradient, and the global text color so child surfaces stay
 * consistent without each one re-declaring the page background.
 */
export function BrandShell({
  children,
  className,
  variant = "hero",
  withBackdrop = true,
}: BrandShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-[#080806] text-[#F7F1E8] antialiased flex flex-col",
        className
      )}
    >
      {withBackdrop && <MagicBackdrop variant={variant} />}
      {children}
    </div>
  );
}
