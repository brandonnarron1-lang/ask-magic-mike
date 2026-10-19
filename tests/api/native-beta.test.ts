// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ viewer: vi.fn(), query: vi.fn(), reply: vi.fn(), mutation: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/intelligence/viewer", () => ({ readR2Viewer: mocks.viewer, r2Enabled: () => true, r2Query: () => ({ query: mocks.query }) }));
vi.mock("@/lib/intelligence/source-lifecycle", async importOriginal => ({ ...await importOriginal<typeof import("../../src/lib/intelligence/source-lifecycle")>(), governedReply: mocks.reply }));
vi.mock("@/lib/preview-security", () => ({ assertDatabaseMutationAllowed: mocks.mutation }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mocks.limit }));
import { BETA_PREFIX, betaWindow } from "../../src/lib/intelligence/beta-contract";
import { betaViewer } from "../../src/lib/intelligence/beta-access";
import { GET, POST } from "../../app/api/native/beta/v1/[...path]/route";
const scope = "guest:" + "a".repeat(64), cookie = "amm-r2-guest=" + "g".repeat(43);
const BETA_ORIGIN = "https://amm-internal-beta-000000000000.vercel.app";
const window = { createdAt: Date.now() - 60000, expiresAt: Date.now() + 6 * 86400000, source: "a".repeat(40), venue: "33333333-3333-4333-8333-333333333333" };
const request = (path = "/api/chat/message", headers: Record<string, string> = {}, body: unknown = { message: "SYNTHETIC public process", knowledge_version: "amm.public-knowledge.v1" }, method = "POST") =>
  new NextRequest(BETA_ORIGIN + BETA_PREFIX + path, { method, headers: { cookie, "x-amm-beta-source": window.source, "content-type": "application/json", ...headers }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("AMM_NATIVE_BETA_MODE", "synthetic-v1"); vi.stubEnv("AMM_NATIVE_BETA_ORIGIN", BETA_ORIGIN); vi.stubEnv("AMM_NATIVE_BETA_WINDOW", JSON.stringify(window)); vi.stubEnv("AMM_NATIVE_BETA_SCOPES", JSON.stringify([scope]));
  mocks.viewer.mockResolvedValue({ ownerScope: scope, consumerUserId: null, consumerSessionId: null });
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", window.source);
  mocks.mutation.mockReturnValue({ ok: true }); mocks.limit.mockResolvedValue({ allowed: true, durable: true }); mocks.reply.mockResolvedValue({ mode: "approved_source", message: "SYNTHETIC ONLY" });
});
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, "false", "true"])("disabled outside exact beta configuration (%s)", async value => {
  vi.stubEnv("AMM_NATIVE_BETA_MODE", value); expect((await POST(request())).status).toBe(403); expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.reply).not.toHaveBeenCalled();
});
it("validates maximum seven-day lifetime; malformed window never becomes ready", () => {
  expect(() => betaWindow({ ...window, expiresAt: window.createdAt + 7 * 86400000 + 1 })).toThrow();
  expect(() => betaWindow({ ...window, token: "private" })).toThrow();
});
it.each(["origin", "referer", "sec-fetch-mode", "sec-fetch-site", "sec-fetch-dest", "authorization"])("refuses %s and does not create or read a viewer", async header => {
  expect((await POST(request(undefined, { [header]: "forged" }))).status).toBe(403); expect(mocks.viewer).not.toHaveBeenCalled();
});
it.each(["", cookie + "; amm-consumer.session=x", cookie + "; staff=x", "amm-r2-guest=short"])("refuses absent/mixed guest jars (%s)", async jar => {
  expect((await POST(request(undefined, { cookie: jar }))).status).toBe(403); expect(mocks.reply).not.toHaveBeenCalled();
});
it("checks the exact origin, fixed expiry and current session without extending either", async () => {
  await expect(betaViewer(request(), window.expiresAt)).rejects.toThrow();
  await expect(betaViewer(request(), window.createdAt - 1)).rejects.toThrow();
  await expect(betaViewer(new Request("https://www.askmagicmike.com/api/native/beta/v1/api/chat/message", { headers: { cookie } }))).rejects.toThrow();
  expect(mocks.viewer).not.toHaveBeenCalled(); mocks.viewer.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(403); expect(mocks.reply).not.toHaveBeenCalled();
});
it("roster membership alone is not session validity, and an unrelated guest is not roster membership", async () => {
  mocks.viewer.mockResolvedValue({ ownerScope: "guest:" + "b".repeat(64), consumerUserId: null, consumerSessionId: null });
  expect((await POST(request())).status).toBe(403); expect(mocks.reply).not.toHaveBeenCalled();
});
it.each(["/api/leads", "/api/admin/notifications/retry", "/api/chat", "/api/intelligence/answers/../leads"])("has no delegation to %s", async path => {
  expect((await POST(request(path))).status).toBe(404); expect(mocks.viewer).not.toHaveBeenCalled();
});
it("a deliberate answer uses the canonical deterministic release service, bounded limiter and final expiry fence", async () => {
  expect((await POST(request())).status).toBe(200); expect(mocks.reply).toHaveBeenCalledTimes(1);
  expect(mocks.limit).toHaveBeenCalledWith(scope, 12, 3600000, "chatMessage");
  const fence = mocks.reply.mock.calls[0][3]; mocks.viewer.mockResolvedValue(null); await expect(fence()).rejects.toThrow();
});
it.each([{ allowed: false, durable: true }, { allowed: true, durable: false }])("fails closed on rate/storage exhaustion (%s)", async limit => {
  mocks.limit.mockResolvedValue(limit); expect((await POST(request())).status).toBe(429); expect(mocks.reply).not.toHaveBeenCalled();
});
it("does not query answers through a wrong or revoked guest and never creates a session on GET", async () => {
  mocks.viewer.mockResolvedValue(null); expect((await GET(request("/api/intelligence/answers?id=11111111-1111-4111-8111-111111111111", {}, undefined, "GET"))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("refuses broad/oversized input and preserves the Preview mutation guard", async () => {
  expect((await POST(request(undefined, {}, { message: "x", knowledge_version: "amm.public-knowledge.v1", ownerScope: scope }))).status).toBe(400);
  expect((await POST(request(undefined, {}, { message: "x".repeat(9000) }))).status).toBe(413);
  mocks.mutation.mockReturnValue({ ok: false, error: "preview_data_disabled", statusCode: 503 });
  expect((await POST(request())).status).toBe(503); expect(mocks.reply).not.toHaveBeenCalled();
});
