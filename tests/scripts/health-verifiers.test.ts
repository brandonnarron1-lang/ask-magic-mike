import { describe, expect, it } from "vitest";

import {
  isAdminHealthResponse,
  isLiveResponse,
  isReadyResponse,
} from "../../scripts/amm/verify-health.mjs";

describe("current production health response contracts", () => {
  it("accepts the active liveness shape without requiring a legacy status field", () => {
    expect(isLiveResponse({ ok: true, service: "ask-magic-mike" })).toBe(true);
    expect(isLiveResponse({ ok: false, service: "ask-magic-mike" })).toBe(false);
  });

  it("accepts only complete Neon readiness responses", () => {
    const ready = {
      ok: true,
      database: "ready",
      capture_function: true,
      leads_table: true,
      notification_table: true,
      push_ready: true,
    };
    expect(isReadyResponse(ready)).toBe(true);
    expect(isReadyResponse({ ...ready, notification_table: false })).toBe(false);
    expect(isReadyResponse({ ...ready, push_ready: false })).toBe(false);
  });

  it("keeps compatibility with the preserved status-based probe shape", () => {
    expect(isLiveResponse({ ok: true, status: "live" })).toBe(true);
    expect(isReadyResponse({ ok: true, status: "ready" })).toBe(true);
  });

  it("requires the protected admin probe to confirm Neon and the lead schema", () => {
    const healthy = {
      ok: true,
      database: {
        provider: "neon_postgres",
        reachable: true,
        lead_pipe_schema_ready: true,
      },
    };
    expect(isAdminHealthResponse(healthy)).toBe(true);
    expect(isAdminHealthResponse({
      ...healthy,
      database: { ...healthy.database, lead_pipe_schema_ready: false },
    })).toBe(false);
  });
});
