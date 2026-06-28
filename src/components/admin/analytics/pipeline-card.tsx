import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/admin/intelligence-engine";
import type { PipelineResult } from "@/lib/admin/intelligence-engine";

interface PipelineCardProps {
  pipeline: PipelineResult;
  className?: string;
}

interface PipelineStageProps {
  label: string;
  count: number;
  value?: string;
  accent?: boolean;
}

function PipelineStage({ label, count, value, accent = false }: PipelineStageProps) {
  return (
    <div className="flex flex-col items-center gap-1 text-center px-3">
      <p
        className={cn(
          "font-bebas text-2xl leading-none tabular-nums",
          accent ? "text-gold-300" : "text-cream"
        )}
      >
        {count.toLocaleString()}
      </p>
      <p className="text-[9px] tracking-label font-semibold uppercase text-slate-500 leading-none">
        {label}
      </p>
      {value && (
        <p className={cn("text-[10px] font-mono tabular-nums", accent ? "text-gold-400/70" : "text-slate-600")}>
          {value}
        </p>
      )}
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center text-slate-700 text-xs" aria-hidden="true">
      →
    </div>
  );
}

export function PipelineCard({ pipeline, className }: PipelineCardProps) {
  const commissionLabel = pipeline.estimatedCommission > 0
    ? formatCurrency(pipeline.estimatedCommission)
    : "—";
  const pipelineValueLabel = pipeline.estimatedValue > 0
    ? formatCurrency(pipeline.estimatedValue)
    : "—";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.07] bg-white/[0.025] p-5",
        className
      )}
      aria-label="Pipeline overview"
    >
      <p className="text-[10.5px] tracking-label font-semibold uppercase text-gold-300/80 mb-4">
        Pipeline
      </p>

      {/* Stage flow */}
      <div className="flex items-center flex-wrap gap-y-3">
        <PipelineStage label="Total Leads" count={pipeline.totalLeads} />
        <PipelineArrow />
        <PipelineStage label="Hot" count={pipeline.hotLeads} />
        <PipelineArrow />
        <PipelineStage label="Appointments" count={pipeline.appointments} />
        <PipelineArrow />
        <PipelineStage label="Contracts" count={pipeline.contracts} value={pipelineValueLabel} />
        <PipelineArrow />
        <PipelineStage label="Closings" count={pipeline.closings} value={commissionLabel} accent />
      </div>

      {/* Footer metrics */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-4">
        <div>
          <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Conv. Rate</p>
          <p className="text-sm font-mono text-cream tabular-nums">
            {pipeline.conversionRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Est. Commission</p>
          <p className="text-sm font-mono text-gold-300 tabular-nums">{commissionLabel}</p>
        </div>
        <div>
          <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">Velocity</p>
          <p className="text-sm font-mono text-slate-400 tabular-nums">
            {pipeline.velocityDays ? `~${pipeline.velocityDays}d` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
