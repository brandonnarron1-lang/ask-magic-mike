import { Shield, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TrustBarProps {
  className?: string;
}

const TRUST_ITEMS = [
  {
    icon: Star,
    label: "Our Town Properties",
  },
  {
    icon: Shield,
    label: "Licensed NC Broker",
  },
  {
    icon: MapPin,
    label: "Wilson, NC",
  },
];

export function TrustBar({ className }: TrustBarProps) {
  return (
    <div
      className={cn(
        "border-t border-gold-400/10 pt-6",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
        {TRUST_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={i} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-gold-400/60" />
              {item.label}
            </span>
          );
        })}

        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400/40" />
          <span className="font-medium text-gold-400/80">Mike Eatmon</span>
        </span>
      </div>
    </div>
  );
}
