/**
 * Phase 11 — Knowledge Graph Engine
 * Builds and traverses the brokerage entity graph.
 * Pure functions — no side effects, no DB calls.
 */

import type {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  NodeType,
  RelationshipType,
  RelationshipSummary,
  IntelligenceSignals,
} from "./types";

// ---------------------------------------------------------------------------
// Node factory
// ---------------------------------------------------------------------------

let _edgeCounter = 0;

export function createNode(
  type: NodeType,
  id: string,
  label: string,
  attributes: Record<string, string | number | boolean | null> = {},
  confidence = 80,
): GraphNode {
  const now = new Date().toISOString();
  return {
    id, type, label, attributes,
    confidence: Math.min(100, Math.max(0, confidence)),
    status:    "active",
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Edge factory
// ---------------------------------------------------------------------------

export function createEdge(
  from: GraphNode,
  to:   GraphNode,
  relationship: RelationshipType,
  strength   = 70,
  origin:      GraphEdge["origin"] = "system",
): GraphEdge {
  const now = new Date().toISOString();
  _edgeCounter++;
  return {
    id:           `edge_${_edgeCounter}`,
    fromId:       from.id,
    toId:         to.id,
    fromType:     from.type,
    toType:       to.type,
    relationship,
    strength:     Math.min(100, Math.max(0, strength)),
    direction:    "unidirectional",
    confidence:   Math.round((from.confidence + to.confidence) / 2),
    origin,
    createdAt:    now,
    updatedAt:    now,
  };
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

export function createEmptyGraph(): KnowledgeGraph {
  return {
    nodes:          new Map(),
    edges:          [],
    generatedAt:    new Date().toISOString(),
    totalNodeCount: 0,
    totalEdgeCount: 0,
  };
}

export function addNode(graph: KnowledgeGraph, node: GraphNode): KnowledgeGraph {
  const nodes = new Map(graph.nodes);
  nodes.set(node.id, node);
  return { ...graph, nodes, totalNodeCount: nodes.size };
}

export function addEdge(graph: KnowledgeGraph, edge: GraphEdge): KnowledgeGraph {
  const edges = [...graph.edges, edge];
  return { ...graph, edges, totalEdgeCount: edges.length };
}

export function mergeGraphs(a: KnowledgeGraph, b: KnowledgeGraph): KnowledgeGraph {
  const nodes = new Map([...a.nodes, ...b.nodes]);
  const seenEdgeIds = new Set(a.edges.map((e) => e.id));
  const edges = [
    ...a.edges,
    ...b.edges.filter((e) => !seenEdgeIds.has(e.id)),
  ];
  return {
    nodes,
    edges,
    generatedAt:    new Date().toISOString(),
    totalNodeCount: nodes.size,
    totalEdgeCount: edges.length,
  };
}

// ---------------------------------------------------------------------------
// Graph traversal
// ---------------------------------------------------------------------------

export function findConnections(
  graph: KnowledgeGraph,
  nodeId: string,
  depth = 1,
): GraphNode[] {
  const visited  = new Set<string>([nodeId]);
  const frontier = [nodeId];
  const result:   GraphNode[] = [];

  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const connectedIds = graph.edges
        .filter((e) => e.fromId === id || e.toId === id)
        .map((e) => (e.fromId === id ? e.toId : e.fromId))
        .filter((cid) => !visited.has(cid));
      for (const cid of connectedIds) {
        visited.add(cid);
        const node = graph.nodes.get(cid);
        if (node) { result.push(node); next.push(cid); }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
    if (frontier.length === 0) break;
  }

  return result;
}

export function traverseGraph(
  graph: KnowledgeGraph,
  startId: string,
  maxDepth = 3,
): GraphNode[] {
  return findConnections(graph, startId, maxDepth);
}

// ---------------------------------------------------------------------------
// Node weight — higher = more connected & high confidence
// ---------------------------------------------------------------------------

export function calculateNodeWeight(node: GraphNode, edges: GraphEdge[]): number {
  const nodeEdges = edges.filter((e) => e.fromId === node.id || e.toId === node.id);
  const avgStrength = nodeEdges.length > 0
    ? nodeEdges.reduce((s, e) => s + e.strength, 0) / nodeEdges.length
    : 0;
  return Math.round((node.confidence * 0.4) + (avgStrength * 0.4) + (Math.min(nodeEdges.length, 10) * 2));
}

// ---------------------------------------------------------------------------
// Relationship summary for a node
// ---------------------------------------------------------------------------

export function getRelationshipMap(
  graph: KnowledgeGraph,
  nodeId: string,
): RelationshipSummary {
  const node = graph.nodes.get(nodeId);
  const nodeEdges = graph.edges.filter((e) => e.fromId === nodeId || e.toId === nodeId);
  const connected = nodeEdges.map((edge) => {
    const otherId = edge.fromId === nodeId ? edge.toId : edge.fromId;
    const n = graph.nodes.get(otherId);
    return n ? { node: n, edge } : null;
  }).filter((x): x is { node: GraphNode; edge: GraphEdge } => x !== null);

  const avgStrength = connected.length > 0
    ? connected.reduce((s, c) => s + c.edge.strength, 0) / connected.length
    : 0;

  return {
    nodeId,
    nodeType:    node?.type ?? "lead",
    connected,
    totalEdges:  connected.length,
    avgStrength: Math.round(avgStrength),
  };
}

// ---------------------------------------------------------------------------
// Build brokerage graph from intelligence signals
// ---------------------------------------------------------------------------

export function buildBrokerageGraph(signals: IntelligenceSignals): KnowledgeGraph {
  let graph = createEmptyGraph();

  // ── Core entity nodes ──────────────────────────────────────────────────
  const brokerage    = createNode("agent",    "brokerage",    "Our Town Properties",  {}, 100);
  const leadPool     = createNode("lead",     "lead_pool",    `${signals.totalLeads} Leads`, { count: signals.totalLeads }, 100);
  const sellerPool   = createNode("seller",   "seller_pool",  `${signals.sellerLeads} Sellers`, { count: signals.sellerLeads }, 90);
  const buyerPool    = createNode("buyer",    "buyer_pool",   `${signals.buyerLeads} Buyers`, { count: signals.buyerLeads }, 90);
  const agentPool    = createNode("agent",    "agent_pool",   `${signals.activeAgents} Active Agents`, { count: signals.activeAgents }, 95);
  const campaignPool = createNode("campaign", "campaign_pool", `${signals.activeCampaigns} Campaigns`, { count: signals.activeCampaigns }, 85);
  const propertyPool = createNode("property", "property_pool", `${signals.totalProperties} Properties`, { count: signals.totalProperties }, 80);
  const apptPool     = createNode("appointment", "appt_pool", `${signals.appointmentsInWindow} Appointments`, { count: signals.appointmentsInWindow }, 85);

  for (const n of [brokerage, leadPool, sellerPool, buyerPool, agentPool, campaignPool, propertyPool, apptPool]) {
    graph = addNode(graph, n);
  }

  // ── Top neighborhood nodes ─────────────────────────────────────────────
  const topN = signals.topNeighborhood;
  if (topN) {
    const neighNode = createNode("traffic", `neighborhood_${topN.replace(/\s+/g, "_")}`, topN, { leads: signals.neighborhoodLeadCounts[topN] ?? 0 }, 75);
    graph = addNode(graph, neighNode);
    graph = addEdge(graph, createEdge(neighNode, leadPool, "generates_by" as RelationshipType, 80));
  }

  // ── Source node ────────────────────────────────────────────────────────
  const topSrc = signals.topCampaignSource || "Organic";
  const srcNode = createNode("source", `source_${topSrc.replace(/\s+/g, "_")}`, topSrc, {}, 70);
  graph = addNode(graph, srcNode);

  // ── Recommendation node ────────────────────────────────────────────────
  const recNode = createNode("recommendation", "rec_node", "AI Recommendations", {}, 88);
  graph = addNode(graph, recNode);

  // ── Workflow node ──────────────────────────────────────────────────────
  const wfNode = createNode("workflow", "workflow_node", "Active Workflows", {}, 88);
  graph = addNode(graph, wfNode);

  // ── Core edges ─────────────────────────────────────────────────────────
  const conversionStrength = Math.round(signals.teamAvgConversionRate);
  graph = addEdge(graph, createEdge(leadPool,     brokerage,    "assigned_to",     80));
  graph = addEdge(graph, createEdge(sellerPool,   leadPool,     "preceded_by",     90));
  graph = addEdge(graph, createEdge(buyerPool,    leadPool,     "preceded_by",     90));
  graph = addEdge(graph, createEdge(campaignPool, leadPool,     "generated_by",    75));
  graph = addEdge(graph, createEdge(agentPool,    brokerage,    "assigned_to",     95));
  graph = addEdge(graph, createEdge(leadPool,     agentPool,    "assigned_to",     conversionStrength));
  graph = addEdge(graph, createEdge(apptPool,     leadPool,     "preceded_by",     signals.appointmentAcceptanceRate));
  graph = addEdge(graph, createEdge(propertyPool, sellerPool,   "interested_in",   70));
  graph = addEdge(graph, createEdge(srcNode,      campaignPool, "influences",      65));
  graph = addEdge(graph, createEdge(recNode,      wfNode,       "triggered",       80));
  graph = addEdge(graph, createEdge(wfNode,       brokerage,    "approved_by",     85));

  // ── Hot lead surge edge ────────────────────────────────────────────────
  if (signals.hotLeads > 0) {
    const hotNode = createNode("lead", "hot_leads", `${signals.hotLeads} Hot Leads`, { count: signals.hotLeads }, 95);
    graph = addNode(graph, hotNode);
    graph = addEdge(graph, createEdge(hotNode, agentPool, "assigned_to", 90));
  }

  // ── Referral edge ──────────────────────────────────────────────────────
  if (signals.referralLeads > 0) {
    const refNode = createNode("source", "referral", "Referral Network", { leads: signals.referralLeads }, 90);
    graph = addNode(graph, refNode);
    graph = addEdge(graph, createEdge(refNode, leadPool, "generated_by", 88));
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Node type distribution summary
// ---------------------------------------------------------------------------

export function getNodeTypeCounts(graph: KnowledgeGraph): Record<NodeType, number> {
  const counts: Partial<Record<NodeType, number>> = {};
  for (const node of graph.nodes.values()) {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
  }
  return counts as Record<NodeType, number>;
}

// ---------------------------------------------------------------------------
// Relationship type distribution
// ---------------------------------------------------------------------------

export function getRelationshipTypeCounts(graph: KnowledgeGraph): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const edge of graph.edges) {
    counts[edge.relationship] = (counts[edge.relationship] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Highest-weight nodes (most connected + confident)
// ---------------------------------------------------------------------------

export function getTopNodes(graph: KnowledgeGraph, n = 5): Array<{ node: GraphNode; weight: number }> {
  return Array.from(graph.nodes.values())
    .map((node) => ({ node, weight: calculateNodeWeight(node, graph.edges) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  lead:           "Lead",
  property:       "Property",
  agent:          "Agent",
  campaign:       "Campaign",
  conversation:   "Conversation",
  task:           "Task",
  appointment:    "Appointment",
  listing:        "Listing",
  offer:          "Offer",
  buyer:          "Buyer",
  seller:         "Seller",
  source:         "Source",
  traffic:        "Traffic",
  question:       "Question",
  recommendation: "Recommendation",
  workflow:       "Workflow",
  automation:     "Automation",
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  interested_in: "Interested In",
  assigned_to:   "Assigned To",
  generated_by:  "Generated By",
  participated_in: "Participated In",
  asked_about:   "Asked About",
  listed_by:     "Listed By",
  owned_by:      "Owned By",
  managed_by:    "Managed By",
  converted_by:  "Converted By",
  triggered:     "Triggered",
  recommended:   "Recommended",
  approved_by:   "Approved By",
  executed_by:   "Executed By",
  influences:    "Influences",
  preceded_by:   "Preceded By",
  followed_by:   "Followed By",
};
