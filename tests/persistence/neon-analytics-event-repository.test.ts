import { describe, expect, it, vi } from "vitest";
import {
  NeonAnalyticsEventRepository,
  safeAnalyticsProperties,
} from "@/lib/persistence/neon/analytics-event-repository";

describe("safeAnalyticsProperties", () => {
  it("removes PII-shaped keys and non-scalar values", () => {
    expect(
      safeAnalyticsProperties({
        source: "widget",
        score: 82,
        email: "person@example.com",
        nested: { unsafe: true },
      }),
    ).toEqual({ source: "widget", score: 82 });
  });
});

describe("NeonAnalyticsEventRepository", () => {
  it("writes a parameterized, privacy-minimized event", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new NeonAnalyticsEventRepository({ query });

    await expect(
      repository.record({
        eventName: "lead_created",
        eventCategory: "intake",
        leadId: "8de9e7cb-bd11-4f49-a5c7-e5b6d6abf598",
        properties: { source: "wordpress", phone: "252-555-0100" },
      }),
    ).resolves.toBe(true);

    expect(query).toHaveBeenCalledOnce();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO public.analytics_events");
    expect(sql).toContain("$1::uuid");
    expect(params[1]).toBe("8de9e7cb-bd11-4f49-a5c7-e5b6d6abf598");
    expect(params[5]).toBe(JSON.stringify({ source: "wordpress" }));
  });

  it("rejects invalid event names before querying", async () => {
    const query = vi.fn();
    const repository = new NeonAnalyticsEventRepository({ query });
    await expect(
      repository.record({ eventName: "INVALID EVENT" }),
    ).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
