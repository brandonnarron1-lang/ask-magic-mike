"use client";

import type { RelationshipSummary, GraphNode, GraphEdge } from "@/lib/intelligence/types";
import { NODE_TYPE_LABELS, RELATIONSHIP_LABELS } from "@/lib/intelligence/knowledge-graph";

// ---------------------------------------------------------------------------
// RelationshipMap — structured relationship viewer (no D3, pure HTML)
// ---------------------------------------------------------------------------

interface RelationshipMapProps {
  summaries:  RelationshipSummary[];
  title?:     string;
  maxItems?:  number;
  className?: string;
}

export function RelationshipMap({
  summaries,
  title    = "Relationship Map",
  maxItems = 8,
  className = "",
}: RelationshipMapProps) {
  const visible = summaries.slice(0, maxItems);

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden", className].join(" ")}>
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <h3 className="text-[10.5px] tracking-[0.18em] font-semibold uppercase text-slate-500">{title}</h3>
        <p className="text-[9px] text-slate-700">{summaries.length} node{summaries.length !== 1 ? "s" : ""} mapped</p>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[10px] text-slate-700">No relationships mapped. Load intelligence signals to populate.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {visible.map((summary) => (
            <RelationshipNode key={summary.nodeId} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RelationshipNode — single node with its connections
// ---------------------------------------------------------------------------

function RelationshipNode({ summary: s }: { summary: RelationshipSummary }) {
  const topConnections = s.connected.slice(0, 3);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] tracking-[0.12em] font-semibold uppercase text-slate-600">
          {NODE_TYPE_LABELS[s.nodeType]}
        </span>
        <span className="text-[9px] text-slate-500">{s.totalEdges} connection{s.totalEdges !== 1 ? "s" : ""}</span>
        <span className="ml-auto text-[9px] text-slate-700">avg strength {s.avgStrength}</span>
      </div>

      <div className="space-y-1.5 pl-3 border-l border-white/[0.05]">
        {topConnections.map(({ node, edge }) => (
          <ConnectionLine key={edge.id} node={node} edge={edge} />
        ))}
        {s.connected.length > 3 && (
          <p className="text-[9px] text-slate-700">+{s.connected.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

function ConnectionLine({ node, edge }: { node: GraphNode; edge: GraphEdge }) {
  const relLabel = RELATIONSHIP_LABELS[edge.relationship] ?? edge.relationship;
  const strengthColor =
    edge.strength >= 80 ? "bg-emerald-500" :
    edge.strength >= 60 ? "bg-gold-400"    :
    edge.strength >= 40 ? "bg-amber-500"   : "bg-slate-600";

  return (
    <div className="flex items-center gap-2">
      <div className={["h-1 w-1 rounded-full shrink-0", strengthColor].join(" ")} aria-hidden="true" />
      <span className="text-[9px] text-slate-600">{relLabel}</span>
      <span className="text-[10px] text-slate-400 flex-1 truncate">{node.label}</span>
      <span className="text-[9px] text-slate-700 tabular-nums shrink-0">{edge.strength}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RelationshipStrength — visual strength indicator
// ---------------------------------------------------------------------------

interface RelationshipStrengthProps {
  strength:  number;   // 0–100
  label?:    string;
  className?: string;
}

export function RelationshipStrength({ strength, label, className = "" }: RelationshipStrengthProps) {
  const color =
    strength >= 80 ? "bg-emerald-400" :
    strength >= 60 ? "bg-gold-400"    :
    strength >= 40 ? "bg-amber-400"   : "bg-slate-600";

  const textColor =
    strength >= 80 ? "text-emerald-400" :
    strength >= 60 ? "text-gold-300"    :
    strength >= 40 ? "text-amber-400"   : "text-slate-500";

  return (
    <div className={["flex items-center gap-2", className].join(" ")}>
      {label && (
        <span className="text-[9px] text-slate-600 shrink-0 w-20 truncate">{label}</span>
      )}
      <div className="flex-1 h-1 rounded-full bg-white/[0.04]">
        <div
          className={["h-full rounded-full transition-all", color].join(" ")}
          style={{ width: `${strength}%` }}
          aria-label={`Relationship strength: ${strength}%`}
        />
      </div>
      <span className={["text-[9px] tabular-nums shrink-0 w-6 text-right", textColor].join(" ")}>
        {strength}
      </span>
    </div>
  );
}
