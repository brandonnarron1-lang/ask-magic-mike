import { Shield, MapPin, Award } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TrustBarProps {
  className?: string;
}

const TRUST_ITEMS = [
  {
    icon: Award,
    label: "Our Town Properties, Inc.",
  },
  {
    icon: Shield,
    label: `Licensed NC Broker${process.env.NEXT_PUBLIC_AGENT_LICENSE ? ` #${process.env.NEXT_PUBLIC_AGENT_LICENSE}` : ""}`,
  },
  {
    icon: MapPin,
    label: "Wilson, NC",
  },
];

export function TrustBar({ className }: TrustBarProps) {
  return (
    <div className={cn("pt-8", className)}>
      <div
        className="rounded-xl border border-gold-400/[0.10] bg-gold-400/[0.025] px-5 py-3.5"
        style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.06)" }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <span key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <Icon className="h-3.5 w-3.5 text-gold-400/55 shrink-0" aria-hidden="true" />
                {item.label}
              </span>
            );
          })}

          <span className="h-3 w-px bg-gold-400/[0.15] hidden sm:block" aria-hidden="true" />

          <span className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400/60" aria-hidden="true" />
            <span className="font-semibold text-gold-400/85">Mike Eatmon</span>
          </span>
        </div>
      </div>
    </div>
  );
}
