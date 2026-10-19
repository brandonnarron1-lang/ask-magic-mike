// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { middleware } from "../../src/middleware";
const origin = "https://amm-internal-beta-000000000000.vercel.app";
const window = { createdAt: Date.now() - 60000, expiresAt: Date.now() + 6 * 86400000, source: "a".repeat(40), venue: "33333333-3333-4333-8333-333333333333" };
const req = (path: string, method = "GET") => new NextRequest(origin + path, { method });
beforeEach(() => {
  vi.stubEnv("AMM_NATIVE_BETA_MODE", "synthetic-v1"); vi.stubEnv("AMM_NATIVE_BETA_ORIGIN", origin);
  vi.stubEnv("AMM_NATIVE_BETA_WINDOW", JSON.stringify(window)); vi.stubEnv("VERCEL_GIT_COMMIT_SHA", window.source);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it.each(["/", "/api/leads", "/api/chat/message", "/admin/activity", "/my", "/api/auth/sign-up/email", "/api/admin/notifications/retry", "/api/admin/copilot/jobs/process"])("closes unrelated surface %s even before route authentication", async path => {
  const r = await middleware(req(path)); expect(r.status).toBe(404); expect(r.headers.get("cache-control")).toContain("no-store");
});
it("allows only registered native route/method combinations, without granting authentication", async () => {
  expect((await middleware(req("/api/native/beta/v1/api/chat/message", "POST"))).headers.get("x-middleware-next")).toBe("1");
  expect((await middleware(req("/api/native/beta/v1/api/chat/message"))).status).toBe(404);
  expect((await middleware(req("/api/native/beta/v1/api/leads", "POST"))).status).toBe(404);
});
it("expiry is server-enforced before any delegation and cannot be extended by a client", async () => {
  vi.useFakeTimers(); vi.setSystemTime(window.expiresAt);
  expect((await middleware(req("/api/native/beta/v1/api/chat/message", "POST"))).status).toBe(410);
});
it.each([undefined, "false", "true"])("fails closed when beta mode is missing or wrong (%s)", async mode => {
  vi.stubEnv("AMM_NATIVE_BETA_MODE", mode); expect((await middleware(req("/api/native/beta/v1/api/chat/message", "POST"))).status).toBe(503);
});
it("refuses a wrong deployed source and immutable host instead of redirecting credentials", async () => {
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "b".repeat(40)); expect((await middleware(req("/api/native/beta/v1/api/chat/message", "POST"))).status).toBe(503);
  const r = await middleware(new NextRequest("https://amm-internal-beta-000000000000-build-eyes-up-industries.vercel.app/api/native/beta/v1/api/chat/message", { method: "POST" }));
  expect(r.status).toBe(503); expect(r.headers.has("location")).toBe(false);
});
it("leaves canonical public routing unchanged", async () => {
  const r = await middleware(new NextRequest("https://www.askmagicmike.com/home-value")); expect(r.headers.get("x-middleware-next")).toBe("1");
});
