import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_LEAD_STATUS_ACTIONS,
  ADMIN_LEAD_STATUSES,
  isAdminLeadStatus,
  updateAdminLeadStatus,
} from "../../app/lib/adminLeadActions";

const ORIGINAL_FETCH = globalThis.fetch;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
});

describe("AdminOps lead status actions", () => {
  it("uses only status values supported by the production leads status constraint", () => {
    expect(ADMIN_LEAD_STATUSES).toEqual([
      "new",
      "scored",
      "qualified",
      "assigned",
      "contacted",
      "appointment_requested",
      "appointment_set",
      "nurture",
      "dead",
      "converted",
      "spam",
      "escalated",
    ]);
    expect(isAdminLeadStatus("spam")).toBe(true);
    expect(isAdminLeadStatus("internal_qa")).toBe(false);
    expect(isAdminLeadStatus("archived")).toBe(false);
  });

  it("exposes operational actions for contacted, qualified, appointment, closed, and spam/test workflows", () => {
    expect(ADMIN_LEAD_STATUS_ACTIONS.map((action) => action.status)).toEqual([
      "contacted",
      "qualified",
      "appointment_set",
      "converted",
      "dead",
      "spam",
      "new",
    ]);
    expect(ADMIN_LEAD_STATUS_ACTIONS.find((action) => action.status === "spam")).toMatchObject({
      requiresConfirmation: true,
      confirmationLabel: "Confirm not a real lead",
    });
  });

  it("updates only the lead status column through a narrow PostgREST PATCH", async () => {
    const captured: Array<{ url: string; init?: RequestInit; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body && typeof init.body === "string"
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      captured.push({ url: String(url), init, body });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [{ id: LEAD_ID, status: "spam" }],
      } as Response;
    }) as unknown as typeof fetch;

    const result = await updateAdminLeadStatus(LEAD_ID, "spam");

    expect(result).toEqual({ ok: true, status: "spam" });
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe("https://fake.supabase.co/rest/v1/leads?id=eq." + LEAD_ID + "&select=id%2Cstatus");
    expect(captured[0].init?.method).toBe("PATCH");
    expect(captured[0].body).toEqual({ status: "spam" });
    expect(captured[0].body).not.toHaveProperty("address_raw");
    expect(captured[0].body).not.toHaveProperty("email");
    expect(captured[0].body).not.toHaveProperty("phone");
  });

  it("rejects invalid lead ids and statuses before calling Supabase", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(updateAdminLeadStatus("not-a-uuid", "spam")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_lead_id",
    });
    await expect(updateAdminLeadStatus(LEAD_ID, "internal_qa")).resolves.toEqual({
      ok: false,
      statusCode: 400,
      error: "invalid_status",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles unknown lead ids without leaking raw database errors", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => [],
    })) as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 404,
      error: "lead_not_found",
    });
  });

  it("returns a safe failure when the lead store is not configured", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(updateAdminLeadStatus(LEAD_ID, "contacted")).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
