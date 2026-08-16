import { describe, expect, it } from "vitest";
import { buildMessagePlan, MockSmsProvider } from "@/lib/messaging/orchestrator";

describe("message orchestrator", () => {
  it("creates stable idempotency and content hashes for approved previews", () => {
    const plan = buildMessagePlan({
      leadId: "00000000-0000-4000-8000-000000000001",
      templateId: "general.email.received",
      renderedBody: "test body",
      permission: { channel: "email", purpose: "transactional_acknowledgment", requestedServiceEmail: true, humanApproved: true, autoSendEnabled: true },
      scheduledAt: new Date("2026-08-15T14:00:00Z"),
    });
    expect(plan.ok).toBe(true);
    expect(plan.idempotencyKey).toContain("general.email.received:phase7-v1");
    expect(plan.renderedContentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks SMS during quiet hours and at frequency cap", () => {
    const plan = buildMessagePlan({
      leadId: "00000000-0000-4000-8000-000000000001",
      templateId: "general.sms.received",
      renderedBody: "Ask Magic Mike",
      permission: { channel: "sms", purpose: "transactional_acknowledgment", requestedServiceSms: true, humanApproved: true, autoSendEnabled: true },
      scheduledAt: new Date("2026-08-15T03:00:00Z"),
      sentInLast24Hours: 2,
      sentInLast7Days: 2,
    });
    expect(plan.ok).toBe(false);
    expect(plan.warnings).toContain("quiet_hours_block");
    expect(plan.warnings).toContain("frequency_cap_block");
  });

  it("deduplicates mock SMS without a carrier call", async () => {
    const provider = new MockSmsProvider();
    const first = await provider.send({ idempotencyKey: "same", body: "test" });
    const replay = await provider.send({ idempotencyKey: "same", body: "test" });
    expect(first.duplicate).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(replay.providerMessageId).toBe(first.providerMessageId);
  });
});
