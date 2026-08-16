import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const query = vi.fn();
const checkBearer = vi.fn();
const flags = vi.fn();

vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/admin/auth", () => ({ checkBearerSecret: (...args: unknown[]) => checkBearer(...args) }));
vi.mock("@/lib/messaging/feature-flags", () => ({ messagingFeatureFlags: () => flags() }));

import { GET } from "../../app/api/admin/sequences/process/route";

const request = () => new NextRequest("https://www.askmagicmike.com/api/admin/sequences/process", {
  headers: { Authorization: "Bearer synthetic" },
});

const claimedStep = {
  id: "11111111-1111-4111-8111-111111111111",
  sequence_instance_id: "22222222-2222-4222-8222-222222222222",
  template_id: "general.email.received",
  template_version: "phase7-v1",
  step_index: 0,
  attempt_count: 1,
  channel: "email",
  purpose: "transactional_acknowledgment",
  lead_id: "33333333-3333-4333-8333-333333333333",
};

describe("Phase 7 test-sequence scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://synthetic.invalid/test";
    process.env.CRON_SECRET = "synthetic";
    checkBearer.mockReturnValue(true);
    flags.mockReturnValue({ sequenceScheduler: true });
    vi.stubGlobal("fetch", vi.fn());
    query
      .mockResolvedValueOnce([claimedStep])
      .mockResolvedValueOnce([{ id: "44444444-4444-4444-8444-444444444444" }])
      .mockResolvedValue([]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("claims and completes one suppressed QA step through the mock provider only", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      processed: 1,
      delivery_mode: "mock_only",
      externally_delivered: false,
      template_id: "general.email.received",
    });
    expect(body.content_hash).toMatch(/^[a-f0-9]{64}$/);
    const claimSql = String(query.mock.calls[0][0]);
    expect(claimSql).toContain("l.is_test = true");
    expect(claimSql).toContain("l.communication_suppressed = true");
    expect(claimSql).toContain("msr.status = 'claimed'");
    expect(claimSql).toContain("interval '5 minutes'");
    expect(claimSql).toContain("FOR UPDATE OF msr SKIP LOCKED");
    expect(String(query.mock.calls[1][0])).toContain("public.communication_decisions");
    expect(String(query.mock.calls[3][0])).toContain("mock_delivered");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing while the scheduler flag is disabled", async () => {
    flags.mockReturnValue({ sequenceScheduler: false });
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ ok: true, processed: 0, disabled: true });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized worker request", async () => {
    checkBearer.mockReturnValue(false);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a clean empty result when no QA step is due", async () => {
    query.mockReset().mockResolvedValue([]);
    const response = await GET(request());
    expect(await response.json()).toEqual({ ok: true, processed: 0, delivery_mode: "mock_only" });
  });

  it("requeues a failed render with bounded retry metadata", async () => {
    query.mockReset()
      .mockResolvedValueOnce([{ ...claimedStep, template_id: "missing.template" }])
      .mockResolvedValue([]);
    const response = await GET(request());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: "template_not_found", delivery_mode: "mock_only" });
    expect(String(query.mock.calls[1][0])).toContain("attempt_count >= 3");
    expect(String(query.mock.calls[1][0])).toContain("interval '5 minutes'");
  });
});
