"use client";

import type { KnowledgeGraph, NodeType } from "@/lib/intelligence/types";
import {
  getNodeTypeCounts,
  getRelationshipTypeCounts,
  getTopNodes,
  NODE_TYPE_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/intelligence/knowledge-graph";

// ---------------------------------------------------------------------------
// KnowledgeGraphCard — summary view of the brokerage knowledge graph
// ---------------------------------------------------------------------------

interface KnowledgeGraphCardProps {
  graph:     KnowledgeGraph;
  className?: string;
}

export function KnowledgeGraphCard({ graph, className = "" }: KnowledgeGraphCardProps) {
  const nodeCounts = getNodeTypeCounts(graph);
  const edgeCounts = getRelationshipTypeCounts(graph);
  const topNodes   = getTopNodes(graph, 5);

  const activeNodeTypes = Object.entries(nodeCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const topRelationships = Object.entries(edgeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden", className].join(" ")}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h3 className="text-[10.5px] tracking-[0.18em] font-semibold uppercase text-slate-500">
            Brokerage Knowledge Graph
          </h3>
          <p className="text-[9px] text-slate-700 mt-0.5">
            {graph.totalNodeCount} nodes · {graph.totalEdgeCount} connection{graph.totalEdgeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-[9px] text-slate-700 font-mono">
          {new Date(graph.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Node type distribution */}
        {activeNodeTypes.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">
              Entity Types
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeNodeTypes.map(([type, count]) => (
                <EntityTypePill key={type} type={type as NodeType} count={count} />
              ))}
            </div>
          </div>
        )}

        {/* Top connections */}
        {topRelationships.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">
              Top Relationship Types
            </p>
            <div className="space-y-1">
              {topRelationships.map(([rel, count]) => (
                <div key={rel} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">
                    {RELATIONSHIP_LABELS[rel as keyof typeof RELATIONSHIP_LABELS] ?? rel}
                  </span>
                  <span className="text-slate-600 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top nodes by weight */}
        {topNodes.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">
              Highest-Weight Nodes
            </p>
            <div className="space-y-1.5">
              {topNodes.map(({ node, weight }) => (
                <div key={node.id} className="flex items-center gap-2">
                  <EntityTypePill type={node.type} count={null} />
                  <span className="text-[10px] text-slate-400 flex-1 truncate">{node.label}</span>
                  <span className="text-[9px] text-slate-700 tabular-nums">{weight}w</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {graph.totalNodeCount === 0 && (
          <p className="text-[10px] text-slate-700 text-center py-4">
            Graph populates as intelligence signals are loaded.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GraphLegend
// ---------------------------------------------------------------------------

interface GraphLegendProps {
  className?: string;
}

export function GraphLegend({ className = "" }: GraphLegendProps) {
  const typeColors: Partial<Record<NodeType, string>> = {
    lead:           "bg-gold-400",
    property:       "bg-amber-500",
    agent:          "bg-cyan-400",
    campaign:       "bg-emerald-400",
    seller:         "bg-ruby-400",
    buyer:          "bg-violet-400",
    source:         "bg-slate-500",
    conversation:   "bg-blue-400",
    workflow:       "bg-gold-600",
    recommendation: "bg-emerald-600",
  };

  return (
    <div className={["rounded-xl border border-white/[0.05] bg-white/[0.01] p-4", className].join(" ")}>
      <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">Graph Legend</p>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={["h-1.5 w-1.5 rounded-full shrink-0", color].join(" ")} aria-hidden="true" />
            <span className="text-[9px] text-slate-500">{NODE_TYPE_LABELS[type as NodeType]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntityNavigator — quick-access by entity type
// ---------------------------------------------------------------------------

interface EntityNavigatorProps {
  graph:     KnowledgeGraph;
  className?: string;
}

export function EntityNavigator({ graph, className = "" }: EntityNavigatorProps) {
  const counts = getNodeTypeCounts(graph);
  const active = (Object.entries(counts) as [NodeType, number][])
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className={["rounded-xl border border-white/[0.06] bg-white/[0.01] p-4", className].join(" ")}>
      <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
        Entity Navigator
      </p>
      <div className="space-y-1.5">
        {active.map(([type, count]) => (
          <div key={type} className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-b-0">
            <span className="text-xs text-slate-400">{NODE_TYPE_LABELS[type]}</span>
            <span className="font-bebas text-base text-cream tabular-nums">{count}</span>
          </div>
        ))}
        {active.length === 0 && (
          <p className="text-[10px] text-slate-700">No entities in graph yet.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function EntityTypePill({ type, count }: { type: NodeType; count: number | null }) {
  const typeColors: Partial<Record<NodeType, string>> = {
    lead:           "text-gold-300   border-gold-300/15",
    property:       "text-amber-400  border-amber-400/15",
    agent:          "text-cyan-400   border-cyan-400/15",
    campaign:       "text-emerald-400 border-emerald-400/15",
    seller:         "text-ruby-400   border-ruby-400/15",
    buyer:          "text-violet-400 border-violet-400/15",
    source:         "text-slate-400  border-white/[0.08]",
    conversation:   "text-blue-400   border-blue-400/15",
    workflow:       "text-gold-500   border-gold-500/15",
    recommendation: "text-emerald-500 border-emerald-500/15",
    automation:     "text-amber-500  border-amber-500/15",
    appointment:    "text-slate-300  border-white/[0.08]",
    listing:        "text-slate-300  border-white/[0.08]",
    offer:          "text-slate-300  border-white/[0.08]",
    task:           "text-slate-300  border-white/[0.08]",
    traffic:        "text-slate-400  border-white/[0.08]",
    question:       "text-slate-400  border-white/[0.08]",
  };

  const style = typeColors[type] ?? "text-slate-500 border-white/[0.06]";

  return (
    <span className={["inline-flex items-center gap-1 text-[9px] font-semibold border rounded-full px-1.5 py-0.5", style].join(" ")}>
      {NODE_TYPE_LABELS[type]}
      {count !== null && <span className="opacity-60">{count}</span>}
    </span>
  );
}
