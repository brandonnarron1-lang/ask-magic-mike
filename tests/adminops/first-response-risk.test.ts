import { describe, expect, it } from "vitest";
import {
  FIRST_RESPONSE_ACTIVE_WINDOW_DAYS,
  FIRST_RESPONSE_SLA_MINUTES,
  evaluateFirstResponseRisk,
} from "../../app/lib/firstResponseRisk";

const NOW = new Date("2026-07-12T14:00:00.000Z");

describe("first-response risk contract", () => {
  it("uses the shared 15-minute SLA and seven-day active window", () => {
    expect(FIRST_RESPONSE_SLA_MINUTES).toBe(15);
    expect(FIRST_RESPONSE_ACTIVE_WINDOW_DAYS).toBe(7);
    expect(evaluateFirstResponseRisk({
      createdAt: "2026-07-12T13:45:00.000Z",
      status: "new",
    }, NOW)).toEqual({
      isRisk: true,
      reason: "risk",
      dueAt: "2026-07-12T14:00:00.000Z",
      ageMinutes: 15,
    });
  });

  it("does not flag a lead while it is still inside the response SLA", () => {
    expect(evaluateFirstResponseRisk({
      createdAt: "2026-07-12T13:46:00.000Z",
      status: "assigned",
    }, NOW).reason).toBe("within_sla");
  });

  it.each([
    ["response_recorded", { firstHumanResponseAt: "2026-07-12T13:50:00.000Z" }],
    ["contact_recorded", { lastContactedAt: "2026-07-12T13:50:00.000Z" }],
    ["terminal", { conversionStage: "closed" }],
    ["excluded", { isTest: true }],
    ["excluded", { communicationSuppressed: true }],
  ] as const)("fails closed with %s evidence", (reason, fields) => {
    expect(evaluateFirstResponseRisk({
      createdAt: "2026-07-12T13:30:00.000Z",
      status: "new",
      ...fields,
    }, NOW)).toEqual(expect.objectContaining({ isRisk: false, reason }));
  });

  it("keeps old inventory in the revival/stalled workflow instead of speed-to-lead", () => {
    expect(evaluateFirstResponseRisk({
      createdAt: "2026-07-05T13:59:59.000Z",
      status: "new",
    }, NOW).reason).toBe("outside_active_window");
  });
});
