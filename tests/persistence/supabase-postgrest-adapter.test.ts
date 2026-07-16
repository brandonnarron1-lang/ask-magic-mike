import { describe, expect, it, vi } from "vitest";
import { SupabasePostgrestAdapter } from "../../app/lib/persistence/supabasePostgrestAdapter";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Supabase PostgREST persistence adapter", () => {
  it("injects transport and invokes the atomic lead lifecycle RPC", async () => {
    const request = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) =>
      response({
        lead_id: "11111111-1111-4111-8111-111111111111",
        session_id: "22222222-2222-4222-8222-222222222222",
        widget_session_id: "22222222-2222-4222-8222-222222222222",
        duplicate_of_lead_id: null,
        assignment_status: "assigned",
        idempotent_replay: false,
      }),
    );
    const adapter = new SupabasePostgrestAdapter({
      baseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "synthetic-local-key",
      fetch: request,
    });

    const result = await adapter.captureLeadLifecycle({
      session: { id: "22222222-2222-4222-8222-222222222222" },
      lead: { normalized_email: "person@example.test" },
      attribution: { utm_source: "synthetic" },
      notificationMode: "disabled",
    });

    if (result.ok === false) throw new Error("expected capture success");
    expect(result.assignment_status).toBe("assigned");
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:54321/rest/v1/rpc/capture_public_lead_v1",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      p_notification_mode: "disabled",
      p_session: { id: "22222222-2222-4222-8222-222222222222" },
    });
  });

  it("uses the atomic appointment and follow-up contract", async () => {
    const request = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) =>
      response({
        ok: true,
        status: "already_requested",
        appointment_id: "33333333-3333-4333-8333-333333333333",
        appointment_status: "requested",
        followup_status: "existing",
      }),
    );
    const adapter = new SupabasePostgrestAdapter({
      baseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "synthetic-local-key",
      fetch: request,
    });

    const result = await adapter.requestAppointment({
      leadId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      requestedAt: "2026-07-16T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      ok: true,
      status: "already_requested",
      followup_status: "existing",
    });
    expect(String(request.mock.calls[0][0])).toContain(
      "/rest/v1/rpc/request_public_appointment_v1",
    );
  });

  it("returns identity and idempotency conflicts without coercing a lead id", async () => {
    const request = vi.fn(async () =>
      response({
        ok: false,
        error: "idempotency_conflict",
        session_id: "22222222-2222-4222-8222-222222222222",
        idempotent_replay: false,
      }),
    );
    const adapter = new SupabasePostgrestAdapter({
      baseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "synthetic-local-key",
      fetch: request,
    });

    await expect(adapter.captureLeadLifecycle({
      session: { id: "22222222-2222-4222-8222-222222222222" },
      lead: { normalized_email: "different@example.test" },
      attribution: {},
      notificationMode: "disabled",
    })).resolves.toEqual({
      ok: false,
      error: "idempotency_conflict",
      session_id: "22222222-2222-4222-8222-222222222222",
      idempotent_replay: false,
    });
  });
});
