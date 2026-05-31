import { cn } from "@/lib/utils/cn";
import { TemperatureBadge } from "./temperature-badge";
import type { Temperature } from "@/types/domain.types";

interface ScoreDisplayProps {
  sellerScore: number;
  buyerScore: number;
  compositeScore: number;
  temperature: Temperature;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-cream">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreDisplay({ sellerScore, buyerScore, compositeScore, temperature }: ScoreDisplayProps) {
  return (
    <div className="space-y-2.5">
      <ScoreBar label="Seller"    value={sellerScore}    color="bg-gold-400" />
      <ScoreBar label="Buyer"     value={buyerScore}     color="bg-amber-400" />
      <ScoreBar label="Composite" value={compositeScore} color="bg-emerald-400" />
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-slate-500">Temperature:</span>
        <TemperatureBadge temperature={temperature} />
      </div>
    </div>
  );
}
