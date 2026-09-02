import { describe, expect, it, vi } from "vitest";
import { NeonPostgresAdapter } from "../../app/lib/persistence/neonPostgresAdapter";

const internalNotification = {
  templateVersion: "lead_alert_email_v3",
  metadata: { correlation_id: "synthetic-correlation" },
};

describe("NeonPostgresAdapter", () => {
  it("returns an idempotent replay from the atomic v2 capture", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ result: {
      ok: true,
      lead_id: "22222222-2222-4222-8222-222222222222",
      session_id: "11111111-1111-4111-8111-111111111111",
      widget_session_id: "11111111-1111-4111-8111-111111111111",
      duplicate_of_lead_id: null,
      assigned_agent_id: null,
      assignment_status: "unassigned",
      notification_id: "33333333-3333-4333-8333-333333333333",
      notification_status: "pending",
      idempotent_replay: true,
    } }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    const result = await adapter.captureLeadLifecycle({
      session: { id: "44444444-4444-4444-8444-444444444444" },
      lead: { request_idempotency_key: "gf:3:1549" },
      attribution: {},
      notificationMode: "disabled",
      internalNotification,
    });

    expect(result).toMatchObject({
      ok: true,
      lead_id: "22222222-2222-4222-8222-222222222222",
      session_id: "11111111-1111-4111-8111-111111111111",
      idempotent_replay: true,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("capture_public_lead_v2");
    expect(JSON.parse(String(query.mock.calls[0][1][4]))).toEqual({
      template_version: "lead_alert_email_v3",
      metadata: { correlation_id: "synthetic-correlation" },
    });
  });

  it("returns a v2 idempotency conflict without a lead id", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ result: {
      ok: false,
      error: "idempotency_conflict",
      session_id: "11111111-1111-4111-8111-111111111111",
      idempotent_replay: false,
    } }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    const result = await adapter.captureLeadLifecycle({
      session: { id: "44444444-4444-4444-8444-444444444444" },
      lead: { request_idempotency_key: "gf:3:1549" },
      attribution: {},
      notificationMode: "disabled",
      internalNotification,
    });

    expect(result).toEqual({
      ok: false,
      error: "idempotency_conflict",
      session_id: "11111111-1111-4111-8111-111111111111",
      idempotent_replay: false,
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("inserts consent columns explicitly so database defaults remain intact", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    await adapter.enrichLeadRecord({
      leadId: "11111111-1111-4111-8111-111111111111",
      leadPatch: {
        score: 91,
        is_test: true,
        request_idempotency_key: "22222222-2222-4222-8222-222222222222",
        consent_source: "seller_page:seller-intake",
      },
      attributionPatch: { placement_id: "preview_qa", page_title: "Seller options" },
      consents: [
        {
          lead_id: "11111111-1111-4111-8111-111111111111",
          consent_type: "email",
          granted: false,
          language_version: "qa-v1",
          collected_at: "2026-08-11T15:00:00.000Z",
        },
      ],
    });

    expect(query).toHaveBeenCalledTimes(3);
    const leadSql = String(query.mock.calls[0][0]);
    const attributionSql = String(query.mock.calls[1][0]);
    expect(leadSql).toContain("request_idempotency_key");
    expect(leadSql).toContain("consent_source");
    expect(attributionSql).toContain("page_title");
    expect(attributionSql).toContain("listing_id");
    const consentSql = String(query.mock.calls[2][0]);
    expect(consentSql).toContain("INSERT INTO public.consents (");
    expect(consentSql).toContain("lead_id, consent_type, granted");
    expect(consentSql).not.toContain("jsonb_populate_record");
  });

  it("returns durable note and task identifiers from canonical Neon RPCs", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ result: {
        ok: true,
        message_id: "11111111-1111-4111-8111-111111111111",
        audit_id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-30T12:00:00.000Z",
      } }])
      .mockResolvedValueOnce([{ result: {
        ok: true,
        task_id: "33333333-3333-4333-8333-333333333333",
        audit_id: "44444444-4444-4444-8444-444444444444",
        created_at: "2026-08-30T12:01:00.000Z",
      } }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    await expect(adapter.addAdminLeadNote({
      leadId: "55555555-5555-4555-8555-555555555555",
      content: "preview-qa note",
      actor: "admin@test.com",
      occurredAt: "2026-08-30T12:00:00.000Z",
    })).resolves.toMatchObject({
      ok: true,
      messageId: "11111111-1111-4111-8111-111111111111",
    });
    await expect(adapter.createAdminLeadTask({
      leadId: "55555555-5555-4555-8555-555555555555",
      title: "preview-qa task",
      priority: "low",
      actor: "admin@test.com",
      occurredAt: "2026-08-30T12:01:00.000Z",
    })).resolves.toMatchObject({
      ok: true,
      taskId: "33333333-3333-4333-8333-333333333333",
    });

    expect(String(query.mock.calls[0][0])).toContain("public.add_admin_lead_note_v1");
    expect(String(query.mock.calls[1][0])).toContain("public.create_admin_lead_task_v1");
  });

  it("uses the reason-aware atomic assignment RPC", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ result: {
      ok: true,
      action: "reassigned",
      audit_id: "11111111-1111-4111-8111-111111111111",
      idempotent_replay: false,
    } }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    await adapter.mutateAdminAssignment({
      leadId: "22222222-2222-4222-8222-222222222222",
      agentId: "33333333-3333-4333-8333-333333333333",
      expectedAgentId: "44444444-4444-4444-8444-444444444444",
      action: "reassigned",
      reason: "owner approved reassignment",
      notificationMode: "disabled",
      actor: "admin@test.com",
      occurredAt: "2026-08-30T12:00:00.000Z",
    });

    expect(String(query.mock.calls[0][0])).toContain("public.mutate_admin_assignment_v2");
    expect(query.mock.calls[0][1]).toContain("owner approved reassignment");
  });
});
