import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.fn();
const recordMock = vi.fn();

vi.mock("../../src/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
  LIMITS: { analyticsEvent: { limit: 60, windowMs: 60_000 } },
  rateLimitKey: () => "test-client",
}));

vi.mock("../../app/lib/publicOrigin", () => ({
  isApprovedPublicOrigin: (origin: string | null) => origin === "https://www.askmagicmike.com",
}));

vi.mock("../../app/lib/persistence/neonPublicExperimentRepository", () => ({
  recordPublicExperimentEvent: (...args: unknown[]) => recordMock(...args),
}));

import { POST } from "../../app/api/experiments/event/route";

function request(body: unknown, origin = "https://www.askmagicmike.com") {
  return new Request("https://www.askmagicmike.com/api/experiments/event", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/experiments/event", () => {
  beforeEach(() => {
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ allowed: true });
    recordMock.mockReset();
    recordMock.mockResolvedValue({ active: false, recorded: false, variantKey: null, reason: "disabled" });
  });

  it("returns an inert accepted response when the server-side gate is disabled", async () => {
    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
    }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ active: false, recorded: false, variant_key: null });
  });

  it("rejects unapproved origins before repository access", async () => {
    const response = await POST(request({}, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects event-name substitution instead of coercing it to an exposure", async () => {
    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "manufactured_conversion",
    }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
});
