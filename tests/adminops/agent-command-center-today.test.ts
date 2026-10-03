import { describe, expect, it } from "vitest";
import { buildAdminTodayQueue } from "../../app/lib/adminTodayQueue";

const NOW = new Date("2026-10-02T15:00:00.000Z");

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-10-02T14:30:00.000Z",
    updated_at: "2026-10-02T14:45:00.000Z",
    status: "new",
    score: 90,
    lead_grade: "A",
    is_test: false,
    communication_suppressed: false,
    assigned_agent_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    first_name: "Lead",
    last_name: "One",
    ...overrides,
  };
}

describe("Agent Command Center Today projection", () => {
  it("excludes test records from work while reporting the exclusion", () => {
    const result = buildAdminTodayQueue({
      leads: [lead({ is_test: true })],
      appointments: [],
      tasks: [],
      now: NOW,
    });
    expect(result.items).toEqual([]);
    expect(result.excludedTestRecords).toBe(1);
    expect(Object.values(result.counts).reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it("separates business urgency from contact permission", () => {
    const blocked = buildAdminTodayQueue({ leads: [lead()], appointments: [], tasks: [], now: NOW });
    expect(blocked.items.find((item) => item.actionKey === "hot-review")).toMatchObject({
      priorityBucket: "hot",
      actionKind: "review_hold",
      blockers: ["contact_permission_missing"],
    });

    const allowed = buildAdminTodayQueue({
      leads: [lead()],
      appointments: [],
      tasks: [],
      permissions: [{
        lead_id: "11111111-1111-4111-8111-111111111111",
        channel: "email",
        purpose: "requested_service_response",
        state: "allowed",
      }],
      now: NOW,
    });
    expect(allowed.items.find((item) => item.actionKey === "hot-review")).toMatchObject({
      priorityBucket: "hot",
      actionKind: "follow_up",
      blockers: [],
    });
  });

  it("treats a permission requiring manual review as a contact blocker", () => {
    const result = buildAdminTodayQueue({
      leads: [lead()],
      appointments: [],
      tasks: [],
      permissions: [{
        lead_id: "11111111-1111-4111-8111-111111111111",
        channel: "email",
        purpose: "requested_service_response",
        state: "allowed",
        manual_review_required: true,
      }],
      now: NOW,
    });
    expect(result.items.find((item) => item.actionKey === "hot-review")).toMatchObject({
      actionKind: "review_hold",
      blockers: ["contact_permission_missing"],
    });
  });

  it("orders deterministic buckets and hides a versioned snoozed action", () => {
    const result = buildAdminTodayQueue({
      leads: [lead({ assigned_agent_id: null }), lead({ id: "22222222-2222-4222-8222-222222222222", score: 50 })],
      appointments: [],
      tasks: [],
      reviews: [{
        lead_id: "22222222-2222-4222-8222-222222222222",
        action_key: "new-review",
        status: "snoozed",
        snooze_until: "2026-10-03T15:00:00.000Z",
        version: 2,
      }],
      now: NOW,
      canViewUnassigned: true,
    });
    expect(result.items[0].priorityBucket).toBe("unassigned_exception");
    expect(result.items.some((item) => item.id === "22222222-2222-4222-8222-222222222222:new-review")).toBe(false);
  });
});
