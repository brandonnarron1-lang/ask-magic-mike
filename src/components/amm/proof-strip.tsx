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
 * ProofStrip — four small proof cards. Sits between the hero copy and the
 * compliance footer. Sized for readability at arm's length; never tiny.
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
          className="flex items-start gap-3 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3"
        >
          <Icon
            className="mt-0.5 h-4 w-4 text-gold-300 shrink-0"
            aria-hidden="true"
          />
          <span className="text-[13.5px] text-[#F7F1E8]/92 leading-snug">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
