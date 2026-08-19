import { describe, expect, it } from "vitest";
import {
  buildDatabaseRevivalIntelligence,
  type RevivalLeadFact,
} from "../../app/lib/revival/intelligence";
import { loadNeonDatabaseRevivalView } from "../../app/lib/persistence/neonDatabaseRevivalView";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const NOW = new Date("2026-08-19T16:00:00.000Z");
const APPROVED_RETENTION_DAYS = 365;

function lead(overrides: Partial<RevivalLeadFact> = {}): RevivalLeadFact {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-01-01T12:00:00.000Z",
    status: "nurture",
    conversionStage: null,
    leadType: "seller",
    primaryIntent: "sell",
    timelineMonths: 3,
    score: 82,
    city: "Wilson",
    zip: "27893",
    source: "ask_magic_mike",
    sourceDetail: "home_value",
    lastContactedAt: "2026-06-20T12:00:00.000Z",
    lastResponseAt: null,
    nextFollowUpAt: null,
    assignedAgentId: "22222222-2222-4222-8222-222222222222",
    assignedAgentName: "Approved Agent",
    assignedAgentActive: true,
    hasEmail: true,
    hasPhone: true,
    emailSuppressed: false,
    smsSuppressed: false,
    marketingEmailState: "allowed",
    marketingSmsState: "not_recorded",
    propertyAlertEmailState: "not_recorded",
    sequenceStatuses: [],
    openTaskCount: 0,
    appointmentRequested: false,
    isTest: false,
    communicationSuppressed: false,
    isDuplicate: false,
    ...overrides,
  };
}

const administrator: LeadCenterPrincipal = {
  userId: "admin-user",
  role: "administrator",
  agentId: null,
  email: "admin@example.test",
  name: "Admin",
};

function schemaRow() {
  return {
    has_leads: true,
    has_permissions: true,
    has_sequences: true,
    has_tasks: true,
    has_agents: true,
  };
}

function databaseRow(overrides: Record<string, unknown> = {}) {
  const value = lead();
  return {
    id: value.id,
    created_at: value.createdAt,
    status: value.status,
    conversion_stage: value.conversionStage,
    lead_type: value.leadType,
    primary_intent: value.primaryIntent,
    timeline_months: value.timelineMonths,
    score: value.score,
    city: value.city,
    zip: value.zip,
    source: value.source,
    source_detail: value.sourceDetail,
    last_contacted_at: value.lastContactedAt,
    last_response_at: value.lastResponseAt,
    next_follow_up_at: value.nextFollowUpAt,
    assigned_agent_id: value.assignedAgentId,
    assigned_agent_name: value.assignedAgentName,
    assigned_agent_active: value.assignedAgentActive,
    has_email: value.hasEmail,
    has_phone: value.hasPhone,
    email_suppressed: value.emailSuppressed,
    sms_suppressed: value.smsSuppressed,
    marketing_email_state: value.marketingEmailState,
    marketing_sms_state: value.marketingSmsState,
    property_alert_email_state: value.propertyAlertEmailState,
    sequence_statuses: value.sequenceStatuses,
    open_task_count: value.openTaskCount,
    appointment_requested: value.appointmentRequested,
    is_test: value.isTest,
    communication_suppressed: value.communicationSuppressed,
    is_duplicate: value.isDuplicate,
    ...overrides,
  };
}

describe("database revival intelligence", () => {
  it("creates an explainable draft-only seller candidate from explicit ongoing permission", () => {
    const result = buildDatabaseRevivalIntelligence({ leads: [lead()], now: NOW, retentionMaxAgeDays: APPROVED_RETENTION_DAYS });
    expect(result).toMatchObject({
      rowsEvaluated: 1,
      staleCandidates: 1,
      draftEligible: 1,
      operatorReview: 0,
      explicitEmailPermission: 1,
    });
    const candidate = result.candidates[0];
    expect(candidate).toMatchObject({
      cohort: "seller_plan_refresh",
      eligibility: "draft_eligible",
      actionClass: "draft_only",
      approvedChannels: ["email_marketing"],
      blockingReasons: [],
    });
    expect(candidate.priorityScore).toBeGreaterThan(50);
    expect(candidate.scoreFactors.map((factor) => factor.code)).toEqual(expect.arrayContaining([
      "baseline",
      "lead_score",
      "explicit_permission",
      "current_owner",
    ]));
    expect(candidate.draft.label).toBe("INTERNAL DRAFT — NOT APPROVED FOR SEND");
    expect(candidate.draft).toMatchObject({ channel: "email", purpose: "marketing_nurture" });
    expect(candidate.draft.body).toContain("not an appraisal, valuation, offer");
  });

  it("requires explicit purpose-specific permission instead of inferring it from contact presence", () => {
    const result = buildDatabaseRevivalIntelligence({
      leads: [lead({
        marketingEmailState: "not_recorded",
        marketingSmsState: "not_recorded",
        propertyAlertEmailState: "not_recorded",
      })],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result.draftEligible).toBe(0);
    expect(result.operatorReview).toBe(1);
    expect(result.candidates[0].approvedChannels).toEqual([]);
    expect(result.candidates[0].blockingReasons).toContain("missing_explicit_permission");
    expect(result.candidates[0].draft).toMatchObject({
      channel: "internal_review",
      purpose: "permission_review",
      subject: null,
    });
    expect(result.candidates[0].draft.body).toContain("No consumer-facing draft is permitted");
  });

  it("blocks conflicting sequences, tasks, appointments, future follow-up, and missing ownership", () => {
    const result = buildDatabaseRevivalIntelligence({
      leads: [lead({
        id: "33333333-3333-4333-8333-333333333333",
        leadType: "buyer",
        primaryIntent: "buy",
        marketingEmailState: "not_recorded",
        propertyAlertEmailState: "allowed",
        sequenceStatuses: ["active"],
        openTaskCount: 2,
        appointmentRequested: true,
        nextFollowUpAt: "2026-08-25T12:00:00.000Z",
        assignedAgentId: null,
        assignedAgentName: null,
      })],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result.candidates[0]).toMatchObject({
      cohort: "buyer_search_refresh",
      eligibility: "operator_review",
      actionClass: "operator_review",
    });
    expect(result.candidates[0].draft).toMatchObject({
      channel: "email",
      purpose: "property_alert_subscription",
    });
    expect(result.candidates[0].blockingReasons).toEqual(expect.arrayContaining([
      "sequence_conflict",
      "open_task_conflict",
      "future_follow_up_scheduled",
      "appointment_in_progress",
      "unassigned",
    ]));
    expect(result.sequenceConflicts).toBe(1);
    expect(result.taskConflicts).toBe(1);
    expect(result.unassigned).toBe(1);
  });

  it("excludes tests, suppressed records, duplicates, terminal stages, and not-yet-stale leads", () => {
    const rows = [
      lead({ id: "00000000-0000-4000-8000-000000000001", isTest: true }),
      lead({ id: "00000000-0000-4000-8000-000000000002", communicationSuppressed: true }),
      lead({ id: "00000000-0000-4000-8000-000000000003", isDuplicate: true }),
      lead({ id: "00000000-0000-4000-8000-000000000004", status: "converted" }),
      lead({ id: "00000000-0000-4000-8000-000000000005", conversionStage: "closed_won" }),
      lead({ id: "00000000-0000-4000-8000-000000000006", lastContactedAt: "2026-08-01T12:00:00.000Z" }),
    ];
    const result = buildDatabaseRevivalIntelligence({ leads: rows, now: NOW, retentionMaxAgeDays: APPROVED_RETENTION_DAYS });
    expect(result.rowsEvaluated).toBe(6);
    expect(result.staleCandidates).toBe(0);
    expect(result.candidates).toEqual([]);
  });

  it("uses cohort-specific dormancy thresholds and bounded confidence", () => {
    const result = buildDatabaseRevivalIntelligence({
      leads: [
        lead({ id: "00000000-0000-4000-8000-000000000011", leadType: "buyer", primaryIntent: "buy", lastContactedAt: "2026-07-01T12:00:00.000Z" }),
        lead({ id: "00000000-0000-4000-8000-000000000012", leadType: "renter", primaryIntent: "unknown", lastContactedAt: "2026-05-01T12:00:00.000Z" }),
        lead({ id: "00000000-0000-4000-8000-000000000013", leadType: "general_question", primaryIntent: "unknown", lastContactedAt: "2026-04-01T12:00:00.000Z" }),
      ],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result.candidates.map((candidate) => candidate.cohort)).toEqual(expect.arrayContaining([
      "buyer_search_refresh",
      "renter_to_owner_review",
      "relationship_check_in",
    ]));
    expect(result.candidates.every((candidate) => candidate.confidence >= 0 && candidate.confidence <= 0.95)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.priorityScore >= 0 && candidate.priorityScore <= 100)).toBe(true);
  });

  it("matches SMS-only permission to an SMS-shaped draft and does not reuse unrelated property-alert permission", () => {
    const smsOnly = buildDatabaseRevivalIntelligence({
      leads: [lead({
        marketingEmailState: "not_recorded",
        marketingSmsState: "allowed",
        hasEmail: false,
      })],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    }).candidates[0];
    expect(smsOnly.eligibility).toBe("draft_eligible");
    expect(smsOnly.draft).toMatchObject({ channel: "sms", purpose: "marketing_nurture", subject: null });
    expect(smsOnly.draft.body).toContain("STOP to opt out; HELP for help");

    const unrelated = buildDatabaseRevivalIntelligence({
      leads: [lead({
        marketingEmailState: "not_recorded",
        marketingSmsState: "not_recorded",
        propertyAlertEmailState: "allowed",
      })],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    }).candidates[0];
    expect(unrelated.eligibility).toBe("operator_review");
    expect(unrelated.blockingReasons).toContain("missing_explicit_permission");
    expect(unrelated.draft).toMatchObject({
      channel: "internal_review",
      purpose: "permission_review",
    });
  });

  it("requires an active canonical owner before a consumer-shaped draft can be eligible", () => {
    const result = buildDatabaseRevivalIntelligence({
      leads: [lead({ assignedAgentActive: false })],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result).toMatchObject({ draftEligible: 0, operatorReview: 1, inactiveOwners: 1 });
    expect(result.candidates[0]).toMatchObject({
      assignedAgentActive: false,
      eligibility: "operator_review",
      actionClass: "operator_review",
    });
    expect(result.candidates[0].blockingReasons).toContain("inactive_owner");
    expect(result.candidates[0].scoreFactors.map((factor) => factor.code)).not.toContain("current_owner");
  });

  it("fails closed without an approved retention window and blocks records outside it", () => {
    const unconfigured = buildDatabaseRevivalIntelligence({ leads: [lead()], now: NOW });
    expect(unconfigured).toMatchObject({ draftEligible: 0, operatorReview: 1, retentionReviewBlocked: 1 });
    expect(unconfigured.candidates[0].blockingReasons).toContain("retention_policy_unconfigured");

    const outside = buildDatabaseRevivalIntelligence({
      leads: [lead()],
      now: NOW,
      retentionMaxAgeDays: 90,
    });
    expect(outside).toMatchObject({ draftEligible: 0, retentionReviewBlocked: 1 });
    expect(outside.candidates[0].blockingReasons).toContain("outside_retention_window");

    const approved = buildDatabaseRevivalIntelligence({
      leads: [lead()],
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(approved).toMatchObject({ draftEligible: 1, retentionReviewBlocked: 0 });
  });
});

describe("canonical Neon database revival view", () => {
  it("uses bounded, minimized canonical reads and returns lead detail to an administrator", async () => {
    const calls: Array<{ query: string; params?: unknown[] }> = [];
    const query = {
      async query(statement: string, params?: unknown[]) {
        calls.push({ query: statement, params });
        return calls.length === 1 ? [schemaRow()] : [databaseRow()];
      },
    };
    const result = await loadNeonDatabaseRevivalView(administrator, {
      query,
      now: NOW,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result).toMatchObject({
      configured: true,
      schemaReady: true,
      detailsVisible: true,
      scopedToAssignedLeads: false,
      rowsRead: 1,
      staleCandidates: 1,
      retentionPolicyConfigured: true,
      retentionMaxAgeDays: APPROVED_RETENTION_DAYS,
    });
    expect(result.candidates).toHaveLength(1);
    const sql = calls[1].query;
    expect(sql).toContain("l.is_test = false");
    expect(sql).toContain("l.communication_suppressed = false");
    expect(sql).toContain("l.duplicate_of_lead_id IS NULL");
    expect(sql).toContain("COALESCE(a.is_active, false) AS assigned_agent_active");
    expect(sql).toContain("LIMIT 1000");
    expect(sql).not.toContain("l.first_name");
    expect(sql).not.toContain("l.last_name");
    expect(sql).not.toContain("l.question_raw");
    expect(sql).not.toContain("l.address_raw");
  });

  it("shows aggregate totals but withholds candidate identifiers from read-only analysts", async () => {
    const analyst: LeadCenterPrincipal = {
      ...administrator,
      userId: "analyst-user",
      role: "read_only_analyst",
    };
    let call = 0;
    const query = { async query() { call += 1; return call === 1 ? [schemaRow()] : [databaseRow()]; } };
    const result = await loadNeonDatabaseRevivalView(analyst, { query, now: NOW, retentionMaxAgeDays: APPROVED_RETENTION_DAYS });
    expect(result.detailsVisible).toBe(false);
    expect(result.staleCandidates).toBe(1);
    expect(result.candidates).toEqual([]);
  });

  it("fails closed on lead-level details when no authenticated principal is supplied", async () => {
    let call = 0;
    const query = { async query() { call += 1; return call === 1 ? [schemaRow()] : [databaseRow()]; } };
    const result = await loadNeonDatabaseRevivalView(null, { query, now: NOW, retentionMaxAgeDays: APPROVED_RETENTION_DAYS });
    expect(result.detailsVisible).toBe(false);
    expect(result.staleCandidates).toBe(1);
    expect(result.candidates).toEqual([]);
  });

  it("server-scopes primary lead owners to their assigned agent identity", async () => {
    const principal: LeadCenterPrincipal = {
      ...administrator,
      userId: "owner-user",
      role: "primary_lead_owner",
      agentId: "22222222-2222-4222-8222-222222222222",
    };
    const calls: Array<{ query: string; params?: unknown[] }> = [];
    const query = {
      async query(statement: string, params?: unknown[]) {
        calls.push({ query: statement, params });
        return calls.length === 1 ? [schemaRow()] : [databaseRow()];
      },
    };
    const result = await loadNeonDatabaseRevivalView(principal, { query, now: NOW, retentionMaxAgeDays: APPROVED_RETENTION_DAYS });
    expect(result.detailsVisible).toBe(true);
    expect(result.scopedToAssignedLeads).toBe(true);
    expect(calls[1].query).toContain("l.assigned_agent_id = $1::uuid");
    expect(calls[1].params).toEqual([principal.agentId]);
  });

  it("reports an unset retention policy and keeps otherwise eligible rows in operator review", async () => {
    let call = 0;
    const query = { async query() { call += 1; return call === 1 ? [schemaRow()] : [databaseRow()]; } };
    const result = await loadNeonDatabaseRevivalView(administrator, {
      query,
      now: NOW,
      retentionMaxAgeDays: null,
    });
    expect(result).toMatchObject({
      retentionPolicyConfigured: false,
      retentionMaxAgeDays: null,
      draftEligible: 0,
      operatorReview: 1,
      retentionReviewBlocked: 1,
    });
    expect(result.candidates[0].blockingReasons).toContain("retention_policy_unconfigured");
  });

  it("fails closed when dependencies are missing or a query fails", async () => {
    const missing = await loadNeonDatabaseRevivalView(administrator, {
      query: { async query() { return [{ ...schemaRow(), has_permissions: false }]; } },
      now: NOW,
    });
    expect(missing.schemaReady).toBe(false);
    expect(missing.candidates).toEqual([]);

    const failed = await loadNeonDatabaseRevivalView(administrator, {
      query: { async query() { throw new Error("secret database detail"); } },
      now: NOW,
    });
    expect(failed.schemaReady).toBe(false);
    expect(failed.error).toBe("Canonical Neon database revival query failed");
    expect(failed.error).not.toContain("secret database detail");
  });
});
