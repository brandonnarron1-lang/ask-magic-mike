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
          className="relative flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 overflow-hidden"
          style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.06)" }}
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
          <Icon
            className="mt-0.5 h-4 w-4 text-gold-400/80 shrink-0"
            aria-hidden="true"
          />
          <span className="text-[13px] text-[#F7F1E8]/90 leading-snug">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
