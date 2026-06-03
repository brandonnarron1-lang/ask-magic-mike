import { ShieldCheck, MapPin, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const PROOFS = [
  { Icon: MapPin,        label: "Local guidance, Wilson NC" },
  { Icon: FileText,      label: "Preliminary home value range" },
  { Icon: MessageSquare, label: "Mike's team follows up directly" },
  { Icon: ShieldCheck,   label: "Licensed in North Carolina · Not an appraisal" },
];

interface ProofStripProps {
  className?: string;
}

/**
 * ProofStrip — four small proof points, four columns on desktop, stacked on
 * mobile. Sits between the hero copy and the compliance footer.
 */
export function ProofStrip({ className }: ProofStripProps) {
  return (
    <ul
      data-testid="proof-strip"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
        className
      )}
    >
      {PROOFS.map(({ Icon, label }) => (
        <li
          key={label}
          className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3"
        >
          <Icon className="mt-0.5 h-4 w-4 text-gold-400/85 shrink-0" />
          <span className="text-[12.5px] text-slate-200 leading-snug">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
