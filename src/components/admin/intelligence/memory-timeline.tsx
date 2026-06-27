"use client";

import type { MemoryRecord, MemoryConsolidation } from "@/lib/intelligence/types";
import { MEMORY_EVENT_LABELS, SIGNIFICANCE_COLORS } from "@/lib/intelligence/memory-engine";

// ---------------------------------------------------------------------------
// MemoryTimeline — chronological record list
// ---------------------------------------------------------------------------

interface MemoryTimelineProps {
  records:    MemoryRecord[];
  title?:     string;
  maxItems?:  number;
  className?: string;
}

export function MemoryTimeline({
  records,
  title    = "Memory Timeline",
  maxItems = 20,
  className = "",
}: MemoryTimelineProps) {
  const sorted  = [...records]
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, maxItems);

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden", className].join(" ")}>
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <h3 className="text-[10.5px] tracking-[0.18em] font-semibold uppercase text-slate-500">{title}</h3>
        <p className="text-[9px] text-slate-700">{records.length} event{records.length !== 1 ? "s" : ""}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[10px] text-slate-700">No memory events recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {sorted.map((record, i) => (
            <MemoryEventRow key={record.id} record={record} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemoryEventRow
// ---------------------------------------------------------------------------

function MemoryEventRow({ record: r, isFirst }: { record: MemoryRecord; isFirst: boolean }) {
  const sigColor = SIGNIFICANCE_COLORS[r.significance];
  const date = new Date(r.recordedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const time = new Date(r.recordedAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className={["flex items-start gap-3 px-4 py-3", isFirst ? "bg-white/[0.015]" : ""].join(" ")}>
      {/* Significance dot */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
        <div
          className={[
            "h-1.5 w-1.5 rounded-full",
            r.significance === "critical" ? "bg-ruby-400 motion-safe:animate-pulse" :
            r.significance === "high"     ? "bg-gold-400" :
            r.significance === "medium"   ? "bg-amber-400" : "bg-slate-600",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={["text-[9px] font-bold uppercase tracking-[0.15em]", sigColor].join(" ")}>
            {MEMORY_EVENT_LABELS[r.eventType]}
          </span>
          <span className="text-[9px] text-slate-700 shrink-0 tabular-nums">{date}</span>
        </div>
        <p className="text-xs text-slate-400 leading-snug">{r.summary}</p>
        <p className="text-[9px] text-slate-700 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryPanel — consolidation summary
// ---------------------------------------------------------------------------

interface HistoryPanelProps {
  consolidation: MemoryConsolidation;
  className?:    string;
}

export function HistoryPanel({ consolidation: c, className = "" }: HistoryPanelProps) {
  const strengthColor =
    c.memoryStrength >= 75 ? "text-emerald-400" :
    c.memoryStrength >= 50 ? "text-gold-300"    :
    c.memoryStrength >= 25 ? "text-amber-400"   : "text-slate-500";

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-3", className].join(" ")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500 mb-0.5">
            Memory Strength
          </p>
          <span className={["font-bebas text-3xl leading-none", strengthColor].join(" ")}>
            {c.memoryStrength}
          </span>
          <span className="text-[9px] text-slate-600 ml-1">/ 100</span>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-600">{c.totalEvents} total events</p>
          <p className="text-[9px] text-slate-600">{c.significantEvents} significant</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{c.narrative}</p>

      {c.keyMilestones.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1.5">
            Key Milestones
          </p>
          <div className="space-y-1.5">
            {c.keyMilestones.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-gold-400 mt-1.5 shrink-0" aria-hidden="true" />
                <p className="text-[10px] text-slate-400 leading-snug">{m.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(c.firstSeenAt || c.lastSeenAt) && (
        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-slate-600">
          {c.firstSeenAt && (
            <span>First: {new Date(c.firstSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
          {c.lastSeenAt && (
            <span>Last: {new Date(c.lastSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
        </div>
      )}
    </div>
  );
}
