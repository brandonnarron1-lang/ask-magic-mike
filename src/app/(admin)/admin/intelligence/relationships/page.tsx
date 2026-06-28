import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  buildBrokerageGraph,
  getRelationshipMap,
  findConnections,
  traverseGraph,
  getTopNodes,
} from "@/lib/intelligence/knowledge-graph";
import { RelationshipMap, RelationshipStrength } from "@/components/admin/intelligence/relationship-map";
import { KnowledgeGraphCard, GraphLegend, EntityNavigator } from "@/components/admin/intelligence/knowledge-graph-card";
import type { RelationshipSummary } from "@/lib/intelligence/types";

export default async function RelationshipsPage() {
  const signals  = await loadIntelligenceSignals();
  const graph    = buildBrokerageGraph(signals);
  const topNodes = getTopNodes(graph, 10);

  const summaries: RelationshipSummary[] = topNodes.map(({ node }) =>
    getRelationshipMap(graph, node.id),
  );

  return (
    <AdminShell
      title="Relationship Map"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Total Nodes",       value: graph.totalNodeCount },
          { label: "Relationships",     value: graph.totalEdgeCount },
          { label: "Mapped Entities",   value: summaries.length     },
          { label: "Avg Connections",   value: summaries.length > 0
              ? Math.round(summaries.reduce((s, m) => s + m.totalEdges, 0) / summaries.length)
              : 0 },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Relationship map (main) */}
        <div className="lg:col-span-2">
          <RelationshipMap summaries={summaries} maxItems={10} />
        </div>

        {/* Sidebar: graph overview + legend */}
        <div className="space-y-4">
          <KnowledgeGraphCard graph={graph} />
          <GraphLegend />
          <EntityNavigator graph={graph} />
        </div>
      </div>

      {/* Strength distribution */}
      {summaries.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Connection Strength by Node
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-2">
            {summaries.slice(0, 10).map((s) => (
              <RelationshipStrength
                key={s.nodeId}
                strength={s.avgStrength}
                label={s.nodeId.slice(0, 24)}
              />
            ))}
          </div>
        </section>
      )}

      {graph.totalNodeCount === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">
            Knowledge graph is empty. Connect Supabase to generate brokerage intelligence.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
