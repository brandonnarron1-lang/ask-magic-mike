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
      className={`rounded-lg border border-[#cda24a33] bg-[linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))] shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
