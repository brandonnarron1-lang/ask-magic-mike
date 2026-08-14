import { describe, expect, it, vi } from "vitest";
import { NeonPostgresAdapter } from "../../app/lib/persistence/neonPostgresAdapter";

describe("NeonPostgresAdapter", () => {
  it("returns the existing Neon lead before capture for a persisted idempotency key", async () => {
    const query = vi.fn().mockResolvedValueOnce([{
      id: "22222222-2222-4222-8222-222222222222",
      session_id: "11111111-1111-4111-8111-111111111111",
      widget_session_id: "11111111-1111-4111-8111-111111111111",
      duplicate_of_lead_id: null,
      assigned_agent_id: null,
      assignment_status: "unassigned",
      request_fingerprint: "same-fingerprint",
      incoming_fingerprint: "same-fingerprint",
    }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    const result = await adapter.captureLeadLifecycle({
      session: { id: "44444444-4444-4444-8444-444444444444" },
      lead: { request_idempotency_key: "gf:3:1549" },
      attribution: {},
      notificationMode: "disabled",
    });

    expect(result).toMatchObject({
      ok: true,
      lead_id: "22222222-2222-4222-8222-222222222222",
      session_id: "11111111-1111-4111-8111-111111111111",
      idempotent_replay: true,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("request_idempotency_key = $1");
  });

  it("rejects a reused Neon idempotency key when the payload fingerprint differs", async () => {
    const query = vi.fn().mockResolvedValueOnce([{
      id: "22222222-2222-4222-8222-222222222222",
      session_id: "11111111-1111-4111-8111-111111111111",
      request_fingerprint: "original-fingerprint",
      incoming_fingerprint: "different-fingerprint",
    }]);
    const adapter = new NeonPostgresAdapter({ query } as never);

    const result = await adapter.captureLeadLifecycle({
      session: { id: "44444444-4444-4444-8444-444444444444" },
      lead: { request_idempotency_key: "gf:3:1549" },
      attribution: {},
      notificationMode: "disabled",
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
});
