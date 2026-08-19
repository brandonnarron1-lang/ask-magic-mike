export const REVIVAL_COHORT_KEYS = [
  "seller_plan_refresh",
  "buyer_search_refresh",
  "renter_to_owner_review",
  "relationship_check_in",
] as const;

export type RevivalCohortKey = (typeof REVIVAL_COHORT_KEYS)[number];
export type RevivalPermissionState = "allowed" | "denied" | "ambiguous" | "opted_out" | "held" | "not_recorded";
export type RevivalEligibility = "draft_eligible" | "operator_review";

export interface RevivalLeadFact {
  id: string;
  createdAt: string;
  status: string;
  conversionStage: string | null;
  leadType: string | null;
  primaryIntent: string | null;
  timelineMonths: number | null;
  score: number | null;
  city: string | null;
  zip: string | null;
  source: string | null;
  sourceDetail: string | null;
  lastContactedAt: string | null;
  lastResponseAt: string | null;
  nextFollowUpAt: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  emailSuppressed: boolean;
  smsSuppressed: boolean;
  marketingEmailState: RevivalPermissionState;
  marketingSmsState: RevivalPermissionState;
  propertyAlertEmailState: RevivalPermissionState;
  sequenceStatuses: string[];
  openTaskCount: number;
  appointmentRequested: boolean;
  isTest: boolean;
  communicationSuppressed: boolean;
  isDuplicate: boolean;
}

export interface RevivalScoreFactor {
  code: string;
  points: number;
  explanation: string;
}

export interface RevivalCandidate {
  leadId: string;
  cohort: RevivalCohortKey;
  cohortLabel: string;
  eligibility: RevivalEligibility;
  priorityScore: number;
  confidence: number;
  scoreFactors: RevivalScoreFactor[];
  daysDormant: number;
  staleThresholdDays: number;
  status: string;
  leadType: string;
  intent: string;
  timelineMonths: number | null;
  city: string | null;
  zip: string | null;
  source: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  approvedChannels: string[];
  permissionEvidence: string[];
  blockingReasons: string[];
  sequenceStatuses: string[];
  openTaskCount: number;
  actionClass: "draft_only" | "operator_review";
  recommendedNextStep: string;
  draft: {
    label: "INTERNAL DRAFT — NOT APPROVED FOR SEND";
    channel: "email" | "sms" | "internal_review";
    purpose: "marketing_nurture" | "property_alert_subscription" | "permission_review";
    subject: string | null;
    body: string;
    factualChecks: string[];
  };
}

export interface RevivalCohortSummary {
  key: RevivalCohortKey;
  label: string;
  total: number;
  draftEligible: number;
  operatorReview: number;
  averagePriority: number;
}

export interface DatabaseRevivalIntelligence {
  generatedAt: string;
  rowsEvaluated: number;
  staleCandidates: number;
  draftEligible: number;
  operatorReview: number;
  explicitEmailPermission: number;
  explicitSmsPermission: number;
  propertyAlertPermission: number;
  sequenceConflicts: number;
  taskConflicts: number;
  unassigned: number;
  cohorts: RevivalCohortSummary[];
  candidates: RevivalCandidate[];
}

const TERMINAL_STATES = new Set([
  "closed",
  "closed_won",
  "closed_lost",
  "converted",
  "dead",
  "disqualified",
  "spam",
  "spam_test",
]);

const CONFLICTING_SEQUENCE_STATES = new Set([
  "draft",
  "approval_required",
  "test",
  "scheduled",
  "active",
  "paused",
]);

const COHORT_LABELS: Record<RevivalCohortKey, string> = {
  seller_plan_refresh: "Seller plan refresh",
  buyer_search_refresh: "Buyer search refresh",
  renter_to_owner_review: "Renter-to-owner review",
  relationship_check_in: "Relationship check-in",
};

function normalized(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function number(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parsedTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function latestActivityAt(lead: RevivalLeadFact) {
  const values = [lead.createdAt, lead.lastContactedAt, lead.lastResponseAt]
    .map(parsedTime)
    .filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
}

function cohortFor(lead: RevivalLeadFact): { key: RevivalCohortKey; thresholdDays: number } {
  const leadType = normalized(lead.leadType);
  const intent = normalized(lead.primaryIntent);
  if (["seller", "seller_cash_offer", "home_value"].includes(leadType) || intent === "sell") {
    return { key: "seller_plan_refresh", thresholdDays: 45 };
  }
  if (["buyer", "listing_inquiry", "open_house", "relocation"].includes(leadType) || intent === "buy") {
    return { key: "buyer_search_refresh", thresholdDays: 30 };
  }
  if (leadType === "renter") {
    return { key: "renter_to_owner_review", thresholdDays: 60 };
  }
  return { key: "relationship_check_in", thresholdDays: 90 };
}

function draftFor(
  cohort: RevivalCohortKey,
  location: string | null,
  path: "email_marketing" | "sms_marketing" | "email_property_alerts" | "internal_review",
) {
  const area = location || "your area";
  if (path === "internal_review") {
    return {
      channel: "internal_review" as const,
      purpose: "permission_review" as const,
      subject: null,
      body: "No consumer-facing draft is permitted for this record. Resolve purpose-specific permission, destination, ownership, and workflow conflicts before preparing outreach copy.",
      factualChecks: [
        "Do not contact the consumer from this record",
        "Verify purpose-specific permission and suppression state",
        "Resolve ownership, task, appointment, and sequence conflicts",
      ],
    };
  }
  if (path === "email_property_alerts") {
    return {
      channel: "email" as const,
      purpose: "property_alert_subscription" as const,
      subject: "Would you like to review your property-alert preferences?",
      body: `Before any property alert is configured or sent, confirm whether ${area} is still the right search area and whether your timing or property preferences changed. This does not confirm inventory, availability, an appointment, or financing.`,
      factualChecks: ["Confirm property-alert permission remains current", "Verify area and frequency before any enrollment", "Do not imply inventory availability"],
    };
  }
  if (path === "sms_marketing") {
    const bodies: Record<RevivalCohortKey, string> = {
      seller_plan_refresh: "Ask Magic Mike / Our Town Properties: Are your selling plans still active? Reply with what changed. No valuation or offer is implied. STOP to opt out; HELP for help.",
      buyer_search_refresh: "Ask Magic Mike / Our Town Properties: Is your home search still active? Reply with updated area, timing, or priorities. Availability is not confirmed. STOP to opt out; HELP for help.",
      renter_to_owner_review: "Ask Magic Mike / Our Town Properties: Would a future homeownership planning review help? Not lending or financial advice. STOP to opt out; HELP for help.",
      relationship_check_in: "Ask Magic Mike / Our Town Properties: Is your prior real-estate question still active? Reply with what changed. STOP to opt out; HELP for help.",
    };
    return {
      channel: "sms" as const,
      purpose: "marketing_nurture" as const,
      subject: null,
      body: bodies[cohort],
      factualChecks: ["Confirm explicit SMS marketing permission remains current", "Confirm registered sender and carrier approval before any pilot", "Preserve STOP and HELP handling"],
    };
  }
  if (cohort === "seller_plan_refresh") {
    return {
      channel: "email" as const,
      purpose: "marketing_nurture" as const,
      subject: `Has your ${area} selling timeline changed?`,
      body: "Checking in to see whether your selling plans are still active or have changed. If a local planning conversation would be useful, reply with the timing or property question you want reviewed. This is not an appraisal, valuation, offer, or promise of an outcome.",
      factualChecks: ["Confirm current service area", "Confirm no property-specific claim is implied", "Confirm explicit marketing permission remains current"],
    };
  }
  if (cohort === "buyer_search_refresh") {
    return {
      channel: "email" as const,
      purpose: "marketing_nurture" as const,
      subject: `Are you still considering a home search around ${area}?`,
      body: "Checking whether your home-search plans are still active. If they are, reply with anything that changed about your preferred area, timing, or priorities. Property availability and financing details must be confirmed separately.",
      factualChecks: ["Confirm current service area", "Do not imply inventory availability", "Confirm explicit marketing or property-alert permission remains current"],
    };
  }
  if (cohort === "renter_to_owner_review") {
    return {
      channel: "email" as const,
      purpose: "marketing_nurture" as const,
      subject: "Would a rental-to-homeownership planning review be useful?",
      body: "Checking whether a future homeownership conversation would be useful. If so, reply with the timing or planning question you want reviewed. This is not lending, credit, legal, or financial advice, and no property availability is implied.",
      factualChecks: ["Confirm the consumer requested ongoing marketing", "Do not make lending or affordability claims", "Confirm service territory before follow-up"],
    };
  }
  return {
    channel: "email" as const,
    purpose: "marketing_nurture" as const,
    subject: "Is your real-estate question still active?",
    body: "Checking whether the real-estate question you previously shared is still active. If help would be useful, reply with what changed and the next decision you want reviewed. No appointment, response time, property availability, or outcome is promised.",
    factualChecks: ["Confirm prior context before using it", "Confirm explicit marketing permission remains current", "Avoid assumptions about current intent"],
  };
}

function priorityFactors(input: {
  lead: RevivalLeadFact;
  daysDormant: number;
  thresholdDays: number;
  approvedChannels: string[];
  blockingReasons: string[];
}) {
  const { lead, daysDormant, thresholdDays, approvedChannels, blockingReasons } = input;
  const factors: RevivalScoreFactor[] = [
    { code: "baseline", points: 20, explanation: "Stale, non-terminal first-party relationship entered review." },
  ];
  const leadScorePoints = Math.round(Math.max(0, Math.min(100, number(lead.score))) * 0.25);
  if (leadScorePoints) factors.push({ code: "lead_score", points: leadScorePoints, explanation: "Existing deterministic lead score contributes up to 25 points." });
  const timeline = lead.timelineMonths;
  const timelinePoints = timeline === 0 ? 20 : timeline === 3 ? 18 : timeline === 6 ? 14 : timeline === 12 ? 9 : timeline === 24 ? 4 : 0;
  if (timelinePoints) factors.push({ code: "stated_timeline", points: timelinePoints, explanation: "The originally stated timeline increases review priority without asserting current intent." });
  const dormancyPoints = Math.max(2, 15 - Math.floor(Math.max(0, daysDormant - thresholdDays) / 30) * 2);
  factors.push({ code: "relevance_window", points: dormancyPoints, explanation: "More recently stale relationships receive higher review priority than very old records." });
  if (approvedChannels.length) factors.push({ code: "explicit_permission", points: 20, explanation: "At least one purpose-specific permission is explicitly allowed." });
  if (lead.assignedAgentId) factors.push({ code: "current_owner", points: 5, explanation: "An approved current owner is recorded." });
  if (lead.city || lead.zip || lead.source) factors.push({ code: "usable_context", points: 5, explanation: "Minimized geography or source context is available for human review." });

  const penalties: Array<[string, number, string]> = [
    ["missing_explicit_permission", -35, "No purpose-specific ongoing communication permission is recorded."],
    ["missing_contact_destination", -30, "No usable destination exists for an otherwise approved channel."],
    ["sequence_conflict", -35, "An existing message sequence must be reconciled before another draft is considered."],
    ["open_task_conflict", -15, "An open operational task already owns the next action."],
    ["future_follow_up_scheduled", -20, "A future follow-up is already scheduled."],
    ["appointment_in_progress", -40, "An appointment workflow is already in progress."],
    ["unassigned", -10, "No approved current owner is recorded."],
  ];
  for (const [code, points, explanation] of penalties) {
    if (blockingReasons.includes(code)) factors.push({ code, points, explanation });
  }
  return factors;
}

function candidateFor(lead: RevivalLeadFact, now: Date): RevivalCandidate | null {
  if (lead.isTest || lead.communicationSuppressed || lead.isDuplicate) return null;
  const status = normalized(lead.status);
  const conversionStage = normalized(lead.conversionStage);
  if (TERMINAL_STATES.has(status) || TERMINAL_STATES.has(conversionStage)) return null;
  const activityAt = latestActivityAt(lead);
  if (activityAt === null) return null;
  const daysDormant = Math.max(0, Math.floor((now.getTime() - activityAt) / 86_400_000));
  const cohort = cohortFor(lead);
  if (daysDormant < cohort.thresholdDays) return null;

  const approvedChannels: string[] = [];
  const permissionEvidence: string[] = [];
  const relevantPermissionPaths: string[] = [];
  if (lead.marketingEmailState === "allowed") {
    permissionEvidence.push("email / marketing_nurture: allowed");
    relevantPermissionPaths.push("email_marketing");
    if (lead.hasEmail && !lead.emailSuppressed) approvedChannels.push("email_marketing");
  }
  if (lead.marketingSmsState === "allowed") {
    permissionEvidence.push("sms / marketing_nurture: allowed");
    relevantPermissionPaths.push("sms_marketing");
    if (lead.hasPhone && !lead.smsSuppressed) approvedChannels.push("sms_marketing");
  }
  if (lead.propertyAlertEmailState === "allowed") {
    permissionEvidence.push("email / property_alert_subscription: allowed");
    if (cohort.key === "buyer_search_refresh") {
      relevantPermissionPaths.push("email_property_alerts");
      if (lead.hasEmail && !lead.emailSuppressed) approvedChannels.push("email_property_alerts");
    }
  }

  const blockingReasons: string[] = [];
  const anyExplicitPermission = relevantPermissionPaths.length > 0;
  if (!anyExplicitPermission) blockingReasons.push("missing_explicit_permission");
  if (anyExplicitPermission && !approvedChannels.length) blockingReasons.push("missing_contact_destination");
  if (lead.sequenceStatuses.some((value) => CONFLICTING_SEQUENCE_STATES.has(normalized(value)))) blockingReasons.push("sequence_conflict");
  if (lead.openTaskCount > 0) blockingReasons.push("open_task_conflict");
  const nextFollowUp = parsedTime(lead.nextFollowUpAt);
  if (nextFollowUp !== null && nextFollowUp > now.getTime()) blockingReasons.push("future_follow_up_scheduled");
  if (lead.appointmentRequested || ["appointment_requested", "appointment_set"].includes(status)) blockingReasons.push("appointment_in_progress");
  if (!lead.assignedAgentId) blockingReasons.push("unassigned");

  const factors = priorityFactors({ lead, daysDormant, thresholdDays: cohort.thresholdDays, approvedChannels, blockingReasons });
  const priorityScore = Math.max(0, Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0)));
  const confidence = Math.min(0.95, 0.45
    + (permissionEvidence.length ? 0.15 : 0)
    + (lead.lastContactedAt || lead.lastResponseAt ? 0.1 : 0)
    + (lead.source ? 0.1 : 0)
    + (lead.score !== null ? 0.1 : 0)
    + (lead.city || lead.zip ? 0.05 : 0));
  const eligibility: RevivalEligibility = blockingReasons.length ? "operator_review" : "draft_eligible";
  const location = lead.city ? `${lead.city}${lead.zip ? `, ${lead.zip}` : ""}` : lead.zip;
  const draftPath = (approvedChannels.includes("email_marketing")
    ? "email_marketing"
    : approvedChannels.includes("email_property_alerts")
      ? "email_property_alerts"
      : approvedChannels.includes("sms_marketing")
        ? "sms_marketing"
        : "internal_review") as "email_marketing" | "sms_marketing" | "email_property_alerts" | "internal_review";
  const draft = draftFor(cohort.key, location, draftPath);

  return {
    leadId: lead.id,
    cohort: cohort.key,
    cohortLabel: COHORT_LABELS[cohort.key],
    eligibility,
    priorityScore,
    confidence: Number(confidence.toFixed(2)),
    scoreFactors: factors,
    daysDormant,
    staleThresholdDays: cohort.thresholdDays,
    status: lead.status || "unknown",
    leadType: lead.leadType || "unknown",
    intent: lead.primaryIntent || "unknown",
    timelineMonths: lead.timelineMonths,
    city: lead.city,
    zip: lead.zip,
    source: lead.source || lead.sourceDetail || "unknown",
    assignedAgentId: lead.assignedAgentId,
    assignedAgentName: lead.assignedAgentName,
    approvedChannels: [...new Set(approvedChannels)],
    permissionEvidence,
    blockingReasons,
    sequenceStatuses: lead.sequenceStatuses,
    openTaskCount: lead.openTaskCount,
    actionClass: eligibility === "draft_eligible" ? "draft_only" : "operator_review",
    recommendedNextStep: eligibility === "draft_eligible"
      ? "Review current relevance, verify the factual checks, and request a separate approval before creating any enrollment or delivery."
      : "Resolve every listed ownership, permission, task, appointment, or sequence conflict before considering a consumer draft.",
    draft: {
      label: "INTERNAL DRAFT — NOT APPROVED FOR SEND",
      ...draft,
    },
  };
}

export function buildDatabaseRevivalIntelligence(input: {
  leads: RevivalLeadFact[];
  now?: Date;
}): DatabaseRevivalIntelligence {
  const now = input.now || new Date();
  const candidates = input.leads
    .map((lead) => candidateFor(lead, now))
    .filter((candidate): candidate is RevivalCandidate => candidate !== null)
    .sort((left, right) => {
      if (left.eligibility !== right.eligibility) return left.eligibility === "draft_eligible" ? -1 : 1;
      if (left.priorityScore !== right.priorityScore) return right.priorityScore - left.priorityScore;
      return left.leadId.localeCompare(right.leadId);
    });

  const cohorts = REVIVAL_COHORT_KEYS.map((key) => {
    const rows = candidates.filter((candidate) => candidate.cohort === key);
    return {
      key,
      label: COHORT_LABELS[key],
      total: rows.length,
      draftEligible: rows.filter((candidate) => candidate.eligibility === "draft_eligible").length,
      operatorReview: rows.filter((candidate) => candidate.eligibility === "operator_review").length,
      averagePriority: rows.length
        ? Math.round(rows.reduce((sum, candidate) => sum + candidate.priorityScore, 0) / rows.length)
        : 0,
    };
  });

  return {
    generatedAt: now.toISOString(),
    rowsEvaluated: input.leads.length,
    staleCandidates: candidates.length,
    draftEligible: candidates.filter((candidate) => candidate.eligibility === "draft_eligible").length,
    operatorReview: candidates.filter((candidate) => candidate.eligibility === "operator_review").length,
    explicitEmailPermission: candidates.filter((candidate) => candidate.approvedChannels.includes("email_marketing")).length,
    explicitSmsPermission: candidates.filter((candidate) => candidate.approvedChannels.includes("sms_marketing")).length,
    propertyAlertPermission: candidates.filter((candidate) => candidate.approvedChannels.includes("email_property_alerts")).length,
    sequenceConflicts: candidates.filter((candidate) => candidate.blockingReasons.includes("sequence_conflict")).length,
    taskConflicts: candidates.filter((candidate) => candidate.blockingReasons.includes("open_task_conflict")).length,
    unassigned: candidates.filter((candidate) => candidate.blockingReasons.includes("unassigned")).length,
    cohorts,
    candidates,
  };
}
