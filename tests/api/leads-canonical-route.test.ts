/**
 * Route-level tests for POST /api/leads (canonical lead capture).
 *
 * Validates schema enforcement, capture-engine delegation, public response
 * shape, and OTPOS / wordpress_cta source routing. LeadCaptureEngine,
 * Supabase, and rate-limit are mocked — no DB or network.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { CaptureResult } from "@/lib/engines/lead-capture";
import type { LeadAllocationResult } from "@/lib/leads/allocation";

const captureMock = vi.fn();
const trackMock = vi.fn();

vi.mock("@/lib/engines/lead-capture", () => ({
  LeadCaptureEngine: class {
    capture = (...args: Parameters<typeof captureMock>) => captureMock(...args);
  },
}));
vi.mock("@/lib/engines/lead-capture-supabase-repo", () => ({
  createSupabaseLeadCaptureRepo: () => ({}),
}));
vi.mock("@/lib/db/types", () => ({
  isSupabaseConfigured: () => true,
  isProduction: () => false,
}));
vi.mock("@/lib/analytics/ledger", () => ({
  trackEventNoWait: (...args: unknown[]) => trackMock(...args),
}));
vi.mock("@/lib/compliance/rate-limit", () => ({
  defaultLeadRateLimiter: { check: () => ({ allowed: true, resetAtMs: 0 }) },
  bucketKey: (ip: string, route: string) => `${ip}:${route}`,
}));

import { POST } from "@/app/api/leads/route";

const MOCK_ALLOCATION: LeadAllocationResult = {
  allocatedQueue: "mike_high_priority_seller_queue",
  allocatedOwner: "Mike Eatmon / Our Town Properties",
  intentCategory: "seller_appointment",
  leadTemperature: "WARM",
  nextAction: "Call/text seller lead and prepare broker-reviewed local market snapshot.",
  status: "qualified",
  leadScore: 55,
  complianceFlags: [],
  spamScore: 0,
  auditReason: "seller_qualified",
  notesRedacted: "",
};

const MOCK_LEAD_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const CAPTURE_OK: CaptureResult = {
  leadId: MOCK_LEAD_ID,
  ok: true,
  isDuplicate: false,
  spamScore: 0,
  isSpamSuspect: false,
  leadType: "seller",
  grade: "B",
  allocation: MOCK_ALLOCATION,
  autoConfirmationQueued: false,
  reasons: [],
  publicPayload: {
    lead_id: MOCK_LEAD_ID,
    received_at: "2026-06-16T00:00:00.000Z",
    next_step: "Mike Eatmon or the Our Town Properties team will follow up.",
  },
};

const CAPTURE_SPAM: CaptureResult = {
  ...CAPTURE_OK,
  leadId: "stub-rejected",
  ok: false,
  grade: "D",
  publicPayload: {
    lead_id: "stub-rejected",
    received_at: "2026-06-16T00:00:00.000Z",
    next_step: "We could not process this request. Please try again.",
  },
};

const CAPTURE_DUP: CaptureResult = {
  ...CAPTURE_OK,
  isDuplicate: true,
  duplicateOfLeadId: MOCK_LEAD_ID,
};

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_LEAD = {
  lead_type: "seller",
  source: "ask_magic_mike_landing",
  email: "jane@example.com",
  phone: "+12525551234",
  first_name: "Jane",
  last_name: "Smith",
  property_address: "123 Main St",
  city: "Wilson",
  state: "NC",
  zip: "27893",
  intent: "Looking to sell my home this spring",
  utm_source: "facebook",
  utm_medium: "paid_social",
  utm_campaign: "wilson-nc-sellers-2026",
};

describe("POST /api/leads (canonical)", () => {
  beforeEach(() => {
    captureMock.mockReset();
    trackMock.mockReset();
  });

  it("accepts a valid seller lead and returns 201 with the public envelope", async () => {
    captureMock.mockResolvedValue(CAPTURE_OK);
    const res = await POST(post(VALID_LEAD));
    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.lead_grade).toBe("B");
    expect(json.is_duplicate).toBe(false);
    const allocation = json.allocation as Record<string, unknown>;
    expect(allocation.allocated_queue).toBe("mike_high_priority_seller_queue");
    expect(allocation.lead_temperature).toBe("WARM");
  });

  it("returns 200 with is_duplicate=true for a duplicate submission", async () => {
    captureMock.mockResolvedValue(CAPTURE_DUP);
    const res = await POST(post(VALID_LEAD));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.is_duplicate).toBe(true);
  });

  it("returns 422 when the capture engine rejects the lead (spam / invalid)", async () => {
    captureMock.mockResolvedValue(CAPTURE_SPAM);
    const res = await POST(post(VALID_LEAD));
    expect(res.status).toBe(422);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(false);
  });

  it("returns 422 for invalid email format", async () => {
    const res = await POST(post({ ...VALID_LEAD, email: "not-an-email" }));
    expect(res.status).toBe(422);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("returns 422 for unknown lead_type", async () => {
    const res = await POST(post({ ...VALID_LEAD, lead_type: "mystery_type" }));
    expect(res.status).toBe(422);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("returns 422 for unknown source", async () => {
    const res = await POST(post({ ...VALID_LEAD, source: "some_made_up_source" }));
    expect(res.status).toBe(422);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ bad json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("defaults source to 'other' and lead_type to 'unknown' when not supplied", async () => {
    captureMock.mockResolvedValue(CAPTURE_OK);
    const { source, lead_type, ...rest } = VALID_LEAD;
    const res = await POST(post(rest));
    expect(res.status).toBe(201);
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "other", lead_type: "unknown" }),
      expect.anything()
    );
  });

  it("accepts wordpress_cta source for OTPOS / Our Town Properties leads", async () => {
    captureMock.mockResolvedValue(CAPTURE_OK);
    const res = await POST(post({ ...VALID_LEAD, source: "wordpress_cta" }));
    expect(res.status).toBe(201);
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "wordpress_cta" }),
      expect.anything()
    );
  });

  it("passes utm attribution fields to the engine for funnel tracking", async () => {
    captureMock.mockResolvedValue(CAPTURE_OK);
    const res = await POST(post(VALID_LEAD));
    expect(res.status).toBe(201);
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: "facebook",
        utm_medium: "paid_social",
        utm_campaign: "wilson-nc-sellers-2026",
      }),
      expect.anything()
    );
  });

  it("accepts a buyer lead with listing_id and budget fields", async () => {
    captureMock.mockResolvedValue({ ...CAPTURE_OK, leadType: "buyer" });
    const res = await POST(post({
      lead_type: "buyer",
      source: "listing_page",
      email: "buyer@example.com",
      first_name: "John",
      listing_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
      budget_min: 200000,
      budget_max: 350000,
      city: "Wilson",
      state: "NC",
    }));
    expect(res.status).toBe(201);
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_type: "buyer",
        source: "listing_page",
        listing_id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        budget_min: 200000,
        budget_max: 350000,
      }),
      expect.anything()
    );
  });

  it("accepts missing attribution fields (all optional)", async () => {
    captureMock.mockResolvedValue(CAPTURE_OK);
    const res = await POST(post({
      lead_type: "seller",
      source: "phone_call",
      first_name: "Mike",
      phone: "+12525559876",
    }));
    expect(res.status).toBe(201);
  });
});
