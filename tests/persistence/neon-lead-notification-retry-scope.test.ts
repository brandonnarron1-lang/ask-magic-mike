import { describe, expect, it, vi } from "vitest";
import { NeonLeadNotificationRepository } from "../../app/lib/persistence/neonLeadNotificationRepository";

describe("Neon notification retry scope", () => {
  it("joins only the lead test marker and keeps the retry query PII-minimal", async () => {
    const query = vi.fn(async (
      _statement: string,
      _parameters?: unknown[],
    ) => [{
      id: "11111111-1111-4111-8111-111111111111",
      lead_id: "22222222-2222-4222-8222-222222222222",
      agent_id: null,
      assignment_audit_id: null,
      assignment_event_at: null,
      notification_type: "lead_alert",
      channel: "email",
      recipient_type: "internal",
      recipient_reference: "email_configured",
      template_version: "lead-alert-v1",
      idempotency_key: "lead-alert:test",
      status: "retry_scheduled",
      attempt_count: 1,
      max_attempts: 3,
      provider: "resend",
      provider_message_id: null,
      error_code: "temporary",
      error_summary: null,
      next_attempt_at: "2026-09-01T20:00:00.000Z",
      created_at: "2026-09-01T19:00:00.000Z",
      updated_at: "2026-09-01T19:00:00.000Z",
      sent_at: null,
      failed_at: "2026-09-01T19:01:00.000Z",
      metadata: {},
      lead_is_test: true,
    }]);
    const repository = new NeonLeadNotificationRepository(
      { query } as never,
    );

    const records = await repository.listRetryable(
      75,
      new Date("2026-09-01T21:00:00.000Z"),
    );

    expect(query).toHaveBeenCalledOnce();
    const [statement, parameters] = query.mock.calls[0];
    expect(statement).toContain("LEFT JOIN public.leads l ON l.id = n.lead_id");
    expect(statement).toContain("l.is_test AS lead_is_test");
    expect(statement).not.toMatch(/l\.(?:email|phone|first_name|last_name|address_raw)/);
    expect(parameters).toEqual(["2026-09-01T21:00:00.000Z", 50]);
    expect(records).toHaveLength(1);
    expect(records[0].lead_is_test).toBe(true);
  });
});
