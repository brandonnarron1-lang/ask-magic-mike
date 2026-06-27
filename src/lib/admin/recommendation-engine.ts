/**
 * Recommendation Engine — deterministic, pure functions.
 *
 * Generates prioritized action cards from real data signals.
 * No LLM. No external API. No writes.
 * Output drives the "What should I do next?" UX.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecommendationCategory =
  | "leads"
  | "campaigns"
  | "agents"
  | "sources"
  | "conversations"
  | "pipeline"
  | "system";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  reason: string;
  action: string;
  impact: string;
  confidence: number;    // 0–100
  expectedGain: string;
  metric?: string;       // supporting stat
}

// ---------------------------------------------------------------------------
// Input shapes (accept partial data — degrades gracefully)
// ---------------------------------------------------------------------------

export interface LeadSignals {
  urgentCount: number;
  slaBreach: number;
  unassigned: number;
  neverContacted: number;
  followUpDue: number;
  totalToday: number;
  total7d: number;
  total7d_prev: number;
  hotPct: number;        // 0–100
}

export interface CampaignSignal {
  slug: string;
  name: string;
  conversionRate: number;
  leads7d: number;
  leads7d_prev: number;
  status: "active" | "draft" | "paused";
}

export interface AgentSignal {
  id: string;
  name: string;
  responseTimeHours: number;
  conversionRate: number;
  slaBreaches: number;
  assignedCount: number;
  avgResponseTimeHours: number;
}

export interface SourceSignal {
  platform: string;
  count7d: number;
  conversion: number;
  trend: number;         // signed % change
}

export interface ConversationSignals {
  abandonRate: number;     // 0–100
  avgMessagesBeforeQual: number;
  avgMessagesBeforeExit: number;
  topObjection: string | null;
  highIntentCount: number;
}

// ---------------------------------------------------------------------------
// Helper: build unique deterministic IDs
// ---------------------------------------------------------------------------

function recId(
  category: RecommendationCategory,
  key: string
): string {
  return `${category}__${key}`;
}

// ---------------------------------------------------------------------------
// Lead recommendations
// ---------------------------------------------------------------------------

export function buildLeadRecommendations(
  signals: LeadSignals
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (signals.slaBreach > 0) {
    recs.push({
      id: recId("leads", "sla_breach"),
      category: "leads",
      priority: "critical",
      title: `${signals.slaBreach} lead${signals.slaBreach > 1 ? "s" : ""} approaching SLA breach`,
      reason: "Response time guarantees at risk. Every hour increases attrition probability by ~12%.",
      action: "Open Lead Inbox → filter by SLA Status → contact immediately",
      impact: "Retain high-intent leads before they contact competitors",
      confidence: 95,
      expectedGain: "Recover 1–3 hot leads",
      metric: `${signals.slaBreach} breaching`,
    });
  }

  if (signals.urgentCount > 0) {
    recs.push({
      id: recId("leads", "urgent_queue"),
      category: "leads",
      priority: "critical",
      title: `${signals.urgentCount} urgent lead${signals.urgentCount > 1 ? "s" : ""} require immediate contact`,
      reason: "Urgent leads score A+ or A with high conversion probability.",
      action: "Open Urgent Queue → prioritize by score → make contact within 15 minutes",
      impact: "High-score leads convert at 3–5× the rate of unscored leads",
      confidence: 90,
      expectedGain: "Convert 1–2 appointments this week",
      metric: `${signals.urgentCount} urgent`,
    });
  }

  if (signals.neverContacted > 0) {
    recs.push({
      id: recId("leads", "never_contacted"),
      category: "leads",
      priority: "high",
      title: `${signals.neverContacted} assigned lead${signals.neverContacted > 1 ? "s" : ""} never contacted`,
      reason: "Assigned leads with no contact log are at high exit risk.",
      action: "Open Lead Inbox → filter Never Contacted → reach out now",
      impact: "First contact within 5 minutes increases qualification rate by ~40%",
      confidence: 85,
      expectedGain: "Recover 1–3 qualified leads",
      metric: `${signals.neverContacted} untouched`,
    });
  }

  if (signals.unassigned > 0) {
    recs.push({
      id: recId("leads", "unassigned"),
      category: "leads",
      priority: "high",
      title: `${signals.unassigned} lead${signals.unassigned > 1 ? "s" : ""} awaiting assignment`,
      reason: "Unassigned leads have no owner — they age unattended.",
      action: "Open Distribution → assign to available agents",
      impact: "Assignment within 1 hour doubles response probability",
      confidence: 88,
      expectedGain: "Activate idle pipeline value",
      metric: `${signals.unassigned} unassigned`,
    });
  }

  if (signals.followUpDue > 2) {
    recs.push({
      id: recId("leads", "follow_up"),
      category: "leads",
      priority: "medium",
      title: `${signals.followUpDue} scheduled follow-ups are due`,
      reason: "Overdue follow-ups erode trust and signal disorganization.",
      action: "Open Follow-Up Queue → work in order of score",
      impact: "Consistent follow-up increases appointment rate by ~25%",
      confidence: 80,
      expectedGain: "Keep pipeline moving forward",
      metric: `${signals.followUpDue} due`,
    });
  }

  // Volume trend
  const trendPct = signals.total7d_prev > 0
    ? ((signals.total7d - signals.total7d_prev) / signals.total7d_prev) * 100
    : 0;
  if (trendPct < -20 && signals.total7d_prev > 3) {
    recs.push({
      id: recId("leads", "volume_drop"),
      category: "leads",
      priority: "high",
      title: `Lead volume down ${Math.abs(Math.round(trendPct))}% vs last week`,
      reason: "Significant inbound drop suggests campaign fatigue or traffic issue.",
      action: "Check Campaign Intelligence → review top source performance",
      impact: "Identify and restore traffic source before pipeline dries",
      confidence: 72,
      expectedGain: "Restore normal inbound velocity",
      metric: `${signals.total7d} vs ${signals.total7d_prev} last week`,
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Campaign recommendations
// ---------------------------------------------------------------------------

export function buildCampaignRecommendations(
  campaigns: CampaignSignal[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (campaigns.length === 0) return recs;

  const sorted = [...campaigns].sort((a, b) => b.conversionRate - a.conversionRate);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const avgConversion =
    campaigns.reduce((s, c) => s + c.conversionRate, 0) / campaigns.length;

  if (top && top.conversionRate > avgConversion * 1.3) {
    recs.push({
      id: recId("campaigns", `top_${top.slug}`),
      category: "campaigns",
      priority: "medium",
      title: `${top.name} is outperforming — increase investment`,
      reason: `Converting at ${top.conversionRate.toFixed(1)}% vs ${avgConversion.toFixed(1)}% average.`,
      action: "Open Campaign Intelligence → allocate more budget / posting frequency",
      impact: "Scaling a top performer generates outsized returns",
      confidence: 78,
      expectedGain: "+3–5 additional leads per week",
      metric: `${top.conversionRate.toFixed(1)}% conversion`,
    });
  }

  if (
    bottom &&
    bottom.status === "active" &&
    bottom.leads7d < 2 &&
    bottom.leads7d_prev < 2 &&
    bottom !== top
  ) {
    recs.push({
      id: recId("campaigns", `pause_${bottom.slug}`),
      category: "campaigns",
      priority: "medium",
      title: `${bottom.name} is underperforming — consider pausing`,
      reason: `Generating fewer than 2 leads per week for 2 consecutive weeks.`,
      action: "Open Campaign Intelligence → review copy and targeting → pause or refresh",
      impact: "Redirect effort to campaigns with traction",
      confidence: 70,
      expectedGain: "Reduce wasted effort, improve overall conversion",
      metric: `${bottom.leads7d} leads this week`,
    });
  }

  // Trend acceleration check
  for (const c of campaigns) {
    if (c.leads7d_prev > 0) {
      const trendPct = ((c.leads7d - c.leads7d_prev) / c.leads7d_prev) * 100;
      if (trendPct >= 30 && c.leads7d >= 3) {
        recs.push({
          id: recId("campaigns", `momentum_${c.slug}`),
          category: "campaigns",
          priority: "medium",
          title: `${c.name} momentum up ${Math.round(trendPct)}%`,
          reason: "Accelerating campaign — window to maximize results is open.",
          action: "Increase posting frequency and boost budget before momentum fades",
          impact: "Capture compound growth during peak performance window",
          confidence: 75,
          expectedGain: `+${Math.round(c.leads7d * 0.3)} additional leads this week`,
          metric: `+${Math.round(trendPct)}% week-over-week`,
        });
        break; // surface only the top momentum story
      }
    }
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Agent recommendations
// ---------------------------------------------------------------------------

export function buildAgentRecommendations(
  agents: AgentSignal[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (agents.length === 0) return recs;

  for (const agent of agents) {
    if (agent.slaBreaches > 2) {
      recs.push({
        id: recId("agents", `sla_${agent.id}`),
        category: "agents",
        priority: "high",
        title: `${agent.name} — ${agent.slaBreaches} SLA breaches this week`,
        reason: "Repeated SLA violations signal capacity or workflow issues.",
        action: "Open Agent Performance → review assigned lead volume and response workflow",
        impact: "Prevent lead attrition from slow response",
        confidence: 85,
        expectedGain: "Recover 1–2 leads per agent per week",
        metric: `${agent.slaBreaches} breaches`,
      });
    }

    if (
      agent.responseTimeHours > agent.avgResponseTimeHours * 2 &&
      agent.avgResponseTimeHours > 0
    ) {
      recs.push({
        id: recId("agents", `slow_${agent.id}`),
        category: "agents",
        priority: "medium",
        title: `${agent.name} response time ${agent.responseTimeHours.toFixed(1)}h — 2× above average`,
        reason: "Extended response time reduces conversion probability significantly.",
        action: "Coach on lead response process or redistribute lead load",
        impact: "Speed to contact is the #1 predictor of lead conversion",
        confidence: 80,
        expectedGain: "Improve response metric within 2 weeks",
        metric: `${agent.responseTimeHours.toFixed(1)}h avg response`,
      });
    }
  }

  // Surface top performer
  const sortedByConversion = [...agents].sort((a, b) => b.conversionRate - a.conversionRate);
  const topAgent = sortedByConversion[0];
  if (topAgent) {
    const avgConv = agents.reduce((s, a) => s + a.conversionRate, 0) / agents.length;
    if (topAgent.conversionRate > avgConv * 1.25 && agents.length > 1) {
      recs.push({
        id: recId("agents", `top_performer_${topAgent.id}`),
        category: "agents",
        priority: "low",
        title: `${topAgent.name} converting ${topAgent.conversionRate.toFixed(1)}% above average`,
        reason: "Top performer identified — process should be documented and replicated.",
        action: "Capture workflow and share with team as best practice",
        impact: "Team-wide conversion lift through process replication",
        confidence: 82,
        expectedGain: "5–10% team conversion lift if adopted",
        metric: `${topAgent.conversionRate.toFixed(1)}% conversion`,
      });
    }
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Source recommendations
// ---------------------------------------------------------------------------

export function buildSourceRecommendations(
  sources: SourceSignal[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (sources.length === 0) return recs;

  const sorted = [...sources].sort((a, b) => b.count7d - a.count7d);
  const topSource = sorted[0];

  if (topSource && topSource.trend > 25) {
    recs.push({
      id: recId("sources", `accelerating_${topSource.platform.replace(/\s/g, "_")}`),
      category: "sources",
      priority: "medium",
      title: `${topSource.platform} growing ${Math.round(topSource.trend)}% — capitalize now`,
      reason: "Traffic source acceleration rarely lasts — act during the window.",
      action: "Increase content frequency on this platform immediately",
      impact: "Convert momentum into pipeline before organic reach declines",
      confidence: 72,
      expectedGain: `+${Math.round(topSource.count7d * 0.25)} additional leads`,
      metric: `+${Math.round(topSource.trend)}% trend`,
    });
  }

  // Find high-conversion but low-volume source (underinvested)
  const underinvested = sources.find(
    (s) => s.conversion > 40 && s.count7d < 3 && s.count7d > 0
  );
  if (underinvested) {
    recs.push({
      id: recId("sources", `underinvested_${underinvested.platform.replace(/\s/g, "_")}`),
      category: "sources",
      priority: "medium",
      title: `${underinvested.platform} converts at ${underinvested.conversion.toFixed(0)}% — underinvested`,
      reason: "High-conversion sources with low volume represent untapped opportunity.",
      action: "Increase posting and campaign budget on this platform",
      impact: "High-conversion sources are premium — marginal spend goes further",
      confidence: 75,
      expectedGain: "+2–4 qualified leads per week",
      metric: `${underinvested.conversion.toFixed(0)}% conversion`,
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Conversation recommendations
// ---------------------------------------------------------------------------

export function buildConversationRecommendations(
  signals: ConversationSignals
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (signals.abandonRate > 40) {
    recs.push({
      id: recId("conversations", "high_abandon"),
      category: "conversations",
      priority: "high",
      title: `${signals.abandonRate.toFixed(0)}% of conversations abandoned — funnel leaking`,
      reason: "High abandon rate suggests friction in the question flow or unclear value proposition.",
      action: "Review Ask page UX → check first question copy → simplify entry barrier",
      impact: "Each 10% reduction in abandon rate adds ~15% more qualified leads",
      confidence: 78,
      expectedGain: "Material increase in funnel completion rate",
      metric: `${signals.abandonRate.toFixed(0)}% abandon`,
    });
  }

  if (signals.avgMessagesBeforeExit < signals.avgMessagesBeforeQual * 0.5) {
    recs.push({
      id: recId("conversations", "early_exit"),
      category: "conversations",
      priority: "medium",
      title: "Users exit before reaching qualification threshold",
      reason: "Most exits occur in less than half the messages needed to qualify.",
      action: "Add early value signals — show Mike's expertise in message 2–3",
      impact: "Keeping users engaged to message 4+ doubles qualification likelihood",
      confidence: 72,
      expectedGain: "Increase qualified lead rate by 15–20%",
      metric: `${signals.avgMessagesBeforeExit.toFixed(1)} msgs before exit`,
    });
  }

  if (signals.highIntentCount > 5 && signals.abandonRate > 30) {
    recs.push({
      id: recId("conversations", "high_intent_abandon"),
      category: "conversations",
      priority: "high",
      title: `${signals.highIntentCount} high-intent conversations abandoned`,
      reason: "High-intent signals (seller/cash offer keywords) detected in abandoned conversations.",
      action: "Add a direct 'Talk to Mike' escalation option at message 3",
      impact: "High-intent abandoners are your most likely listings — do not lose them",
      confidence: 82,
      expectedGain: "Recover 2–4 potential listing conversations",
      metric: `${signals.highIntentCount} high-intent`,
    });
  }

  if (signals.topObjection) {
    recs.push({
      id: recId("conversations", "top_objection"),
      category: "conversations",
      priority: "low",
      title: `Most common objection: "${signals.topObjection}"`,
      reason: "Recurring objections represent a copywriting and positioning opportunity.",
      action: "Add a direct response to this objection in the Ask page introduction",
      impact: "Preempting top objections improves completion rate by 8–12%",
      confidence: 68,
      expectedGain: "Improve funnel completion rate",
      metric: "Top objection detected",
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Main recommendation aggregator
// ---------------------------------------------------------------------------

export interface RecommendationSummary {
  all: Recommendation[];
  critical: Recommendation[];
  high: Recommendation[];
  byCategory: Record<RecommendationCategory, Recommendation[]>;
  totalCount: number;
  criticalCount: number;
  topThree: Recommendation[];
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildRecommendationSummary(params: {
  leadSignals?: LeadSignals;
  campaignSignals?: CampaignSignal[];
  agentSignals?: AgentSignal[];
  sourceSignals?: SourceSignal[];
  conversationSignals?: ConversationSignals;
}): RecommendationSummary {
  const all: Recommendation[] = [
    ...(params.leadSignals ? buildLeadRecommendations(params.leadSignals) : []),
    ...(params.campaignSignals ? buildCampaignRecommendations(params.campaignSignals) : []),
    ...(params.agentSignals ? buildAgentRecommendations(params.agentSignals) : []),
    ...(params.sourceSignals ? buildSourceRecommendations(params.sourceSignals) : []),
    ...(params.conversationSignals ? buildConversationRecommendations(params.conversationSignals) : []),
  ].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });

  const critical = all.filter((r) => r.priority === "critical");
  const high = all.filter((r) => r.priority === "high");

  const byCategory: Record<RecommendationCategory, Recommendation[]> = {
    leads: [],
    campaigns: [],
    agents: [],
    sources: [],
    conversations: [],
    pipeline: [],
    system: [],
  };
  for (const r of all) {
    byCategory[r.category].push(r);
  }

  return {
    all,
    critical,
    high,
    byCategory,
    totalCount: all.length,
    criticalCount: critical.length,
    topThree: all.slice(0, 3),
  };
}
