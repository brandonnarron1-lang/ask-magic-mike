// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ process: vi.fn(), health: vi.fn(), generic: vi.fn(), ready: true, delivery: true, admin: true }));
vi.mock("../../app/lib/leadAlertService", () => ({ processNewLaunchAlerts: mocks.process,
  readNewLaunchAlertHealth: mocks.health, retryDueLeadAlertNotifications: mocks.generic,
  notificationRetryDeliveryReady: () => mocks.ready }));
vi.mock("../../src/lib/admin/auth", () => ({
  checkBearerSecret: (request: Request) => request.headers.get("authorization") === "Bearer synthetic-cron",
  checkAdminAuth: () => mocks.admin ? { ok: true } : { ok: false, status: 401, error: "unauthorized" },
}));
vi.mock("../../src/lib/preview-security", () => ({ assertProviderDeliveryAllowed: () => mocks.delivery ? { ok: true } : { ok: false, statusCode: 503, error: "preview_data_disabled" } }));
import { GET, POST } from "../../app/api/admin/notifications/retry/route";
function request(cron = true, body?: unknown) {
  return new NextRequest("https://fixture.example.test/api/admin/notifications/retry", { method: body ? "POST" : "GET",
    headers: { ...(cron ? { authorization: "Bearer synthetic-cron" } : {}), "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.ready = true; mocks.delivery = true; mocks.admin = true;
  mocks.process.mockResolvedValue([]); mocks.generic.mockResolvedValue([]);
  mocks.health.mockResolvedValue({ unresolved_over_5m: 2, ambiguous_over_5m: 1, failed_over_5m: 1, accepted_not_delivered_over_5m: 0 });
});
afterEach(() => vi.unstubAllEnvs());
function activate() { vi.stubEnv("LEAD_ALERT_V6_WORKER_ENABLED", "true"); vi.stubEnv("LEAD_ALERT_V6_CUTOFF", "2026-10-13T18:11:00.000Z"); }
it("retains default cron 409 with no processing or health queries", async () => {
  vi.stubEnv("LEAD_ALERT_V6_WORKER_ENABLED", "false"); expect((await GET(request())).status).toBe(409);
  expect(mocks.process).not.toHaveBeenCalled(); expect(mocks.health).not.toHaveBeenCalled();
});
it("does not activate cron without a valid cutoff", async () => {
  activate(); vi.stubEnv("LEAD_ALERT_V6_CUTOFF", ""); expect((await GET(request())).status).toBe(409);
  expect(mocks.process).not.toHaveBeenCalled();
});
it("runs only the bounded launch worker and returns count-only health", async () => {
  activate(); const response = await GET(request()); const result = await response.json();
  expect(response.status).toBe(200); expect(result).toMatchObject({ scope: "launch_v6", processed: 0, health: { unresolved_over_5m: 2 } });
  expect(mocks.process).toHaveBeenCalledOnce(); expect(mocks.generic).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toContain("private_intake_snapshot");
});
it("refuses Preview delivery before worker/health access", async () => {
  activate(); mocks.delivery = false; expect((await GET(request())).status).toBe(503);
  expect(mocks.process).not.toHaveBeenCalled(); expect(mocks.health).not.toHaveBeenCalled();
});
it("does not consume due envelopes while provider configuration is unavailable", async () => {
  activate(); mocks.ready = false; expect((await GET(request())).status).toBe(503); expect(mocks.process).not.toHaveBeenCalled();
});
it("retains administrator GET readiness without dispatch", async () => {
  activate(); expect(await (await GET(request(false))).json()).toEqual({ ok: true, status: "retry_endpoint_ready" });
  expect(mocks.process).not.toHaveBeenCalled();
});
it("denies unauthenticated administrator readiness", async () => {
  mocks.admin = false; expect((await GET(request(false))).status).toBe(401); expect(mocks.process).not.toHaveBeenCalled();
});
it("keeps POST on the existing generic manual processor", async () => {
  activate(); expect((await POST(request(false, { limit: 2 }))).status).toBe(200);
  expect(mocks.generic).toHaveBeenCalledWith(2); expect(mocks.process).not.toHaveBeenCalled();
});
