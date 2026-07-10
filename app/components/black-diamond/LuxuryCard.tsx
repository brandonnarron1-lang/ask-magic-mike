import type { ReactNode } from "react";

type LuxuryCardProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function LuxuryCard({ children, className = "", id }: LuxuryCardProps) {
  return (
    <div
      id={id}
      className={`amm-glass-card rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}
