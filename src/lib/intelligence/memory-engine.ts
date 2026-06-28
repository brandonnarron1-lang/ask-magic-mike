/**
 * Phase 11 — Brokerage Memory Engine
 * Deterministic, append-only institutional memory.
 * Reads from analytics_events; never writes.
 */

import type {
  MemoryRecord,
  MemoryConsolidation,
  MemoryEventType,
  MemorySignificance,
  NodeType,
} from "./types";

// ---------------------------------------------------------------------------
// Event-type to significance mapping
// ---------------------------------------------------------------------------

const EVENT_SIGNIFICANCE: Record<MemoryEventType, MemorySignificance> = {
  conversion:           "critical",
  appointment_set:      "critical",
  lead_created:         "high",
  first_contact:        "high",
  appointment_missed:   "high",
  reactivation:         "high",
  score_changed:        "medium",
  status_changed:       "medium",
  offer_interest:       "medium",
  agent_assigned:       "medium",
  property_viewed:      "low",
  question_asked:       "low",
  campaign_exposed:     "low",
  follow_up_completed:  "low",
  dead_lead:            "medium",
};

export { MEMORY_EVENT_LABELS, SIGNIFICANCE_COLORS } from "./memory-constants";

// ---------------------------------------------------------------------------
// Memory record factory
// ---------------------------------------------------------------------------

export function buildMemoryRecord(
  entityId:    string,
  entityType:  NodeType,
  eventType:   MemoryEventType,
  summary:     string,
  context:     Record<string, string | number | boolean | null> = {},
  recordedAt?: string,
): MemoryRecord {
  return {
    id:           `mem_${entityId}_${eventType}_${Date.now()}`,
    entityId,
    entityType,
    eventType,
    summary,
    context,
    significance: EVENT_SIGNIFICANCE[eventType],
    recordedAt:   recordedAt ?? new Date().toISOString(),
    expiresAt:    null,
    immutable:    true,
  };
}

// ---------------------------------------------------------------------------
// Memory strength — 0–100
// More significant events = stronger memory
// ---------------------------------------------------------------------------

export function calculateMemoryStrength(records: MemoryRecord[]): number {
  if (records.length === 0) return 0;

  const weights: Record<MemorySignificance, number> = {
    critical: 25,
    high:     15,
    medium:   8,
    low:      3,
  };

  const raw = records.reduce((sum, r) => sum + weights[r.significance], 0);
  return Math.min(100, raw);
}

// ---------------------------------------------------------------------------
// Consolidate memory records into a unified summary
// ---------------------------------------------------------------------------

export function consolidateMemory(
  entityId:   string,
  entityType: NodeType,
  records:    MemoryRecord[],
): MemoryConsolidation {
  const sorted = [...records].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const significantEvents = sorted.filter(
    (r) => r.significance === "critical" || r.significance === "high"
  );

  const keyMilestones = sorted.filter(
    (r) => r.significance === "critical"
  ).slice(0, 5);

  const hasConversion    = sorted.some((r) => r.eventType === "conversion");
  const hasAppointment   = sorted.some((r) => r.eventType === "appointment_set");
  const hasMissedAppt    = sorted.some((r) => r.eventType === "appointment_missed");
  const hasReactivation  = sorted.some((r) => r.eventType === "reactivation");

  let narrative = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} has ${records.length} memory event${records.length !== 1 ? "s" : ""}`;
  if (hasConversion)   narrative += " — converted";
  else if (hasAppointment) narrative += " — appointment set";
  else if (hasMissedAppt)  narrative += " — missed appointment";
  if (hasReactivation)     narrative += " — reactivated";

  return {
    entityId,
    entityType,
    totalEvents:      records.length,
    significantEvents: significantEvents.length,
    memoryStrength:   calculateMemoryStrength(records),
    firstSeenAt:      sorted[0]?.recordedAt ?? null,
    lastSeenAt:       sorted[sorted.length - 1]?.recordedAt ?? null,
    keyMilestones,
    narrative,
  };
}

// ---------------------------------------------------------------------------
// Build synthetic memory records from analytics_events rows
// ---------------------------------------------------------------------------

interface RawAnalyticsEvent {
  id:          string;
  event_name:  string;
  properties:  Record<string, string | number | boolean | null> | null;
  created_at:  string;
  lead_id?:    string | null;
}

export function buildMemoryFromEvents(
  entityId:   string,
  entityType: NodeType,
  events:     RawAnalyticsEvent[],
): MemoryRecord[] {
  const records: MemoryRecord[] = [];

  for (const ev of events) {
    const eventType = mapAnalyticsEventToMemoryType(ev.event_name);
    if (!eventType) continue;

    const summary = buildMemorySummary(eventType, ev.properties ?? {});
    records.push(buildMemoryRecord(
      entityId,
      entityType,
      eventType,
      summary,
      ev.properties ?? {},
      ev.created_at,
    ));
  }

  return records;
}

// ---------------------------------------------------------------------------
// Map analytics event names → memory event types
// ---------------------------------------------------------------------------

function mapAnalyticsEventToMemoryType(
  eventName: string,
): MemoryEventType | null {
  const name = eventName.toLowerCase();
  if (name.includes("lead_created") || name.includes("lead.created"))   return "lead_created";
  if (name.includes("first_contact") || name.includes("first.contact")) return "first_contact";
  if (name.includes("appointment_set") || name.includes("appointment.set")) return "appointment_set";
  if (name.includes("appointment_missed"))                               return "appointment_missed";
  if (name.includes("property_view") || name.includes("property.view")) return "property_viewed";
  if (name.includes("question"))                                         return "question_asked";
  if (name.includes("valuation") || name.includes("offer"))             return "offer_interest";
  if (name.includes("campaign") || name.includes("utm"))                return "campaign_exposed";
  if (name.includes("assigned"))                                         return "agent_assigned";
  if (name.includes("follow_up") || name.includes("contact"))           return "follow_up_completed";
  if (name.includes("convert") || name.includes("conversion"))          return "conversion";
  if (name.includes("dead") || name.includes("lost"))                   return "dead_lead";
  if (name.includes("reactivat"))                                        return "reactivation";
  if (name.includes("score"))                                            return "score_changed";
  if (name.includes("status"))                                           return "status_changed";
  return null;
}

// ---------------------------------------------------------------------------
// Human-readable summary line
// ---------------------------------------------------------------------------

function buildMemorySummary(
  eventType: MemoryEventType,
  props: Record<string, string | number | boolean | null>,
): string {
  switch (eventType) {
    case "lead_created":        return "Lead entered the system";
    case "first_contact":       return "First contact made";
    case "appointment_set":     return `Appointment scheduled${props["date"] ? ` for ${props["date"]}` : ""}`;
    case "appointment_missed":  return "Scheduled appointment was missed";
    case "property_viewed":     return `Viewed property${props["address"] ? `: ${props["address"]}` : ""}`;
    case "question_asked":      return `Asked: "${props["question"] ?? "property question"}"`;
    case "offer_interest":      return "Expressed interest in cash offer / valuation";
    case "campaign_exposed":    return `Reached via ${props["source"] ?? "campaign"}`;
    case "agent_assigned":      return `Assigned to ${props["agent_name"] ?? "agent"}`;
    case "follow_up_completed": return "Follow-up completed";
    case "conversion":          return "Lead converted";
    case "dead_lead":           return "Lead marked as dead";
    case "reactivation":        return "Lead reactivated";
    case "score_changed":       return `Score changed to ${props["score"] ?? "new value"}`;
    case "status_changed":      return `Status changed to ${props["status"] ?? "new status"}`;
    default:                    return MEMORY_EVENT_LABELS[eventType] ?? "Event recorded";
  }
}

// ---------------------------------------------------------------------------
// Load entity memory from Supabase (graceful degradation)
// ---------------------------------------------------------------------------

export async function loadEntityMemory(
  entityId:   string,
  entityType: NodeType,
  limit       = 50,
): Promise<MemoryRecord[]> {
  try {
    const { createServerSupabaseClient } = await import("../supabase/server");
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, event_name, properties, created_at, lead_id")
      .eq("lead_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return buildMemoryFromEvents(entityId, entityType, data);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Load brokerage-wide memory summary
// ---------------------------------------------------------------------------

export async function loadBrokerageMemorySummary(limit = 100): Promise<{
  totalRecords:     number;
  criticalCount:    number;
  highCount:        number;
  recentMilestones: MemoryRecord[];
  topEntities:      Array<{ entityId: string; strength: number; eventCount: number }>;
}> {
  try {
    const { createServerSupabaseClient } = await import("../supabase/server");
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, event_name, properties, created_at, lead_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return { totalRecords: 0, criticalCount: 0, highCount: 0, recentMilestones: [], topEntities: [] };

    const byEntity: Record<string, RawAnalyticsEvent[]> = {};
    for (const ev of data) {
      const key = (ev as Record<string, string>)["lead_id"] ?? "brokerage";
      byEntity[key] = byEntity[key] ?? [];
      byEntity[key].push(ev as RawAnalyticsEvent);
    }

    const topEntities = Object.entries(byEntity)
      .map(([entityId, evts]) => {
        const records = buildMemoryFromEvents(entityId, "lead", evts);
        return { entityId, strength: calculateMemoryStrength(records), eventCount: records.length };
      })
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);

    const allRecords = buildMemoryFromEvents("brokerage", "agent", data as RawAnalyticsEvent[]);
    const recentMilestones = allRecords
      .filter((r) => r.significance === "critical" || r.significance === "high")
      .slice(0, 10);

    return {
      totalRecords:  allRecords.length,
      criticalCount: allRecords.filter((r) => r.significance === "critical").length,
      highCount:     allRecords.filter((r) => r.significance === "high").length,
      recentMilestones,
      topEntities,
    };
  } catch {
    return { totalRecords: 0, criticalCount: 0, highCount: 0, recentMilestones: [], topEntities: [] };
  }
}
