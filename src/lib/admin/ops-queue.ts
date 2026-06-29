/**
 * Lead Ops Priority Queue — pure data builder.
 *
 * Accepts the already-filtered followUpQueue from RevenueCommandData
 * (synthetic leads already excluded upstream) and returns items sorted
 * by urgency. No DB queries. No writes. No outbound.
 */

import type { RevenueCommandData } from "./revenue-command";

export type OpsCategory =
  | "sla_breach"
  | "urgent"
  | "hot_unassigned"
  | "never_contacted"
  | "missing_attribution"
  | "incomplete_contact"
  | "follow_up_due";

export interface OpsQueueItem {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: OpsCategory;
  urgencyLabel: string;
  leadLabel: string;
  ageLabel: string;
  ageMinutes: number;
  temperature: string | null;
  score: number | null;
  grade: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  assigned: boolean;
  missingAttribution: boolean;
  detailUrl: string;
}

const TEMP_ORDER: Record<string, number> = {
  urgent: 1,
  hot:    2,
  warm:   3,
  nurture: 4,
  low:    5,
};

function ageMinutesOf(isoString: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000));
}

function fmtAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const hrs = Math.floor(minutes / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function buildOpsQueue(
  followUpQueue: RevenueCommandData["followUpQueue"],
): OpsQueueItem[] {
  const items: OpsQueueItem[] = [];

  for (const lead of followUpQueue) {
    const age = ageMinutesOf(lead.createdAt);
    const missingAttribution =
      !lead.utmSource && !lead.utmMedium && !lead.utmCampaign && !lead.referrerType;
    const missingContact = !lead.hasEmail && !lead.hasPhone;
    const temp       = lead.temperature ?? null;
    const isUrgent   = temp === "urgent";
    const isHot      = temp === "hot";
    const isUnassigned = !lead.assigned;
    const isHighGrade  = lead.grade === "A+" || lead.grade === "A";
    const isSlaOld     = age > 120;

    let priority: 1 | 2 | 3 | 4 | 5;
    let category: OpsCategory;
    let urgencyLabel: string;

    if (isUrgent && isSlaOld) {
      priority     = 1;
      category     = "sla_breach";
      urgencyLabel = "SLA BREACH";
    } else if (isUrgent) {
      priority     = 1;
      category     = "urgent";
      urgencyLabel = "URGENT";
    } else if (isHighGrade && isUnassigned) {
      priority     = 2;
      category     = "hot_unassigned";
      urgencyLabel = "HOT · UNASSIGNED";
    } else if (isHot && isUnassigned) {
      priority     = 2;
      category     = "hot_unassigned";
      urgencyLabel = "HOT · UNASSIGNED";
    } else if (isHot) {
      priority     = 2;
      category     = "hot_unassigned";
      urgencyLabel = "HOT";
    } else if (isUnassigned && isSlaOld) {
      priority     = 3;
      category     = "never_contacted";
      urgencyLabel = "NEVER CONTACTED";
    } else if (missingContact) {
      priority     = 4;
      category     = "incomplete_contact";
      urgencyLabel = "INCOMPLETE CONTACT";
    } else if (missingAttribution) {
      priority     = 4;
      category     = "missing_attribution";
      urgencyLabel = "MISSING ATTRIBUTION";
    } else {
      priority     = 5;
      category     = "follow_up_due";
      urgencyLabel = "FOLLOW-UP DUE";
    }

    items.push({
      id:                lead.id,
      priority,
      category,
      urgencyLabel,
      leadLabel:         lead.firstName ?? "Unknown",
      ageLabel:          fmtAge(age),
      ageMinutes:        age,
      temperature:       temp,
      score:             lead.score ?? null,
      grade:             lead.grade ?? null,
      hasEmail:          lead.hasEmail,
      hasPhone:          lead.hasPhone,
      assigned:          lead.assigned,
      missingAttribution,
      detailUrl:         lead.leadDetailUrl,
    });
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ta = TEMP_ORDER[a.temperature ?? "low"] ?? 5;
    const tb = TEMP_ORDER[b.temperature ?? "low"] ?? 5;
    if (ta !== tb) return ta - tb;
    return b.ageMinutes - a.ageMinutes;
  });

  return items;
}

export function groupOpsQueue(
  items: OpsQueueItem[],
): Array<{ priority: number; label: string; items: OpsQueueItem[] }> {
  const GROUP_LABELS: Record<number, string> = {
    1: "Immediate Action",
    2: "High Priority",
    3: "Never Contacted",
    4: "Data Quality",
    5: "Scheduled Follow-Up",
  };

  const map = new Map<number, OpsQueueItem[]>();
  for (const item of items) {
    if (!map.has(item.priority)) map.set(item.priority, []);
    map.get(item.priority)!.push(item);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([priority, groupItems]) => ({
      priority,
      label: GROUP_LABELS[priority] ?? `Priority ${priority}`,
      items: groupItems,
    }));
}
