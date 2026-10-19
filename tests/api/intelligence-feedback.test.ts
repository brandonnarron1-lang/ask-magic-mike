// @vitest-environment node
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), viewer: vi.fn(), permission: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/intelligence/viewer", () => ({ readR2Viewer: mocks.viewer, r2Query: () => ({ query: mocks.query }) }));
vi.mock("@/lib/admin/rbac-session", () => ({ requireLeadCenterApiPermission: mocks.permission }));
vi.mock("@/lib/preview-security", () => ({ assertDatabaseMutationAllowed: mocks.mutation }));
import { GET, POST } from "../../app/api/intelligence/feedback/route";
import { GET as adminGET, POST as adminPOST } from "../../app/api/admin/intelligence/feedback/route";

const answerId = randomUUID();
const payload = () => ({ answerId, revision: 1, requestId: randomUUID(), kind: "report", category: "other", comment: "synthetic" });
function request(body: unknown, options: { origin?: string | null; contentType?: string; length?: string; fetchSite?: string } = {}) {
  return new NextRequest("https://app.example.test/api/intelligence/feedback", { method: "POST", headers: {
    ...(options.origin === null ? {} : { origin: options.origin || "https://app.example.test" }),
    "content-type": options.contentType || "application/json", ...(options.length ? { "content-length": options.length } : {}),
    ...(options.fetchSite ? { "sec-fetch-site": options.fetchSite } : {}),
  }, body: JSON.stringify(body) });
}
describe("feedback private API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("R2_SOURCE_GOVERNANCE_ENABLED", "true");
    mocks.viewer.mockResolvedValue({ ownerScope: "guest:trusted", consumerUserId: null, consumerSessionId: null });
    mocks.query.mockResolvedValue([{ result: { ok: true, feedback: { id: randomUUID() } }, feedback: [] }]);
    mocks.permission.mockResolvedValue({ ok: true, principal: { userId: "staff-server-actor" } });
    mocks.mutation.mockReturnValue({ ok: true });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, "false", "1", "TRUE"])("requires flag exactly true (%s)", async flag => {
    vi.stubEnv("R2_SOURCE_GOVERNANCE_ENABLED", flag);
    expect((await POST(request(payload()))).status).toBe(404);
    expect(mocks.viewer).not.toHaveBeenCalled(); expect(mocks.query).not.toHaveBeenCalled();
  });
  it.each([{ origin: "https://evil.test" }, { origin: null }, { fetchSite: "cross-site" }])("rejects origin/CSRF mismatch %j", async options => {
    expect((await POST(request(payload(), options))).status).toBe(403);
    expect((await adminPOST(request(payload(), options))).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("enforces preview mutation protection before storage", async () => {
    mocks.mutation.mockReturnValue({ ok: false, error: "preview_data_disabled", statusCode: 503 });
    expect((await POST(request(payload()))).status).toBe(503);
    expect((await adminPOST(request(payload()))).status).toBe(503);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("rejects large declared/actual payloads, oversized comments and browser scope", async () => {
    expect((await POST(request(payload(), { length: "20000" }))).status).toBe(413);
    expect((await POST(request({ ...payload(), comment: "x".repeat(20000) }))).status).toBe(413);
    expect((await POST(request({ ...payload(), comment: "x".repeat(2001) }))).status).toBe(400);
    expect((await POST(request({ ...payload(), ownerScope: "forged" }))).status).toBe(400);
    expect((await POST(request(payload(), { contentType: "text/plain" }))).status).toBe(415);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("returns indistinguishable missing-answer responses for unknown viewers and copied answer IDs", async () => {
    mocks.viewer.mockResolvedValueOnce(null);
    const absent = await POST(request(payload()));
    mocks.query.mockResolvedValueOnce([{ result: { ok: false, error: "answer_not_found" } }]);
    const copied = await POST(request(payload()));
    expect(absent.status).toBe(404); expect(await absent.json()).toEqual(await copied.json());
  });
  it("maps SQL replay/rate-limit failures and returns private no-store responses", async () => {
    for (const [error, status] of [["feedback_replay_conflict", 409], ["feedback_rate_limited", 429]] as const) {
      mocks.query.mockResolvedValueOnce([{ result: { ok: false, error } }]);
      const response = await POST(request(payload()));
      expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toContain("private, no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
  it("GET restores only the viewer's own acknowledgment with no writes, including prefetch", async () => {
    const response = await GET(new NextRequest(`https://app.example.test/api/intelligence/feedback?answerId=${answerId}&revision=1`, { headers: { purpose: "prefetch" } }));
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toMatch(/^SELECT public.read_r2_feedback_v1/);
    expect(mocks.query.mock.calls[0][1]).toEqual([answerId, 1, "guest:trusted", null, null]);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it("staff reads and writes require user:manage, including denial responses", async () => {
    mocks.permission.mockResolvedValue({ ok: false, response: NextResponse.json({ ok: false }, { status: 403 }) });
    const result = await adminGET(new NextRequest("https://app.example.test/api/admin/intelligence/feedback"));
    expect(result.status).toBe(403); expect(result.headers.get("cache-control")).toContain("private, no-store");
    expect((await adminPOST(request({})) ).status).toBe(403);
    expect(mocks.permission.mock.calls.every(call => call[1] === "user:manage")).toBe(true);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("staff GET is read-only and review uses only authenticated actor and exact revision", async () => {
    expect((await adminGET(new NextRequest("https://app.example.test/api/admin/intelligence/feedback"))).status).toBe(200);
    expect(mocks.query.mock.calls[0]).toEqual(["SELECT public.list_r2_feedback_v1($1) AS feedback", ["staff-server-actor"]]);
    const input = { feedbackId: randomUUID(), expectedRevision: 7, requestId: randomUUID(), action: "resolve" };
    const response = await adminPOST(request(input));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sendsCommunication: false, createsTask: false, modelCalls: 0 });
    expect(mocks.query.mock.calls[1][1][1]).toBe(7); expect(mocks.query.mock.calls[1][1][4]).toBe("staff-server-actor");
  });
  it("storage failures do not disclose exception text or viewer identity", async () => {
    mocks.query.mockRejectedValue(Error("private-server-secret"));
    const response = await POST(request(payload()));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-server-secret");
  });
});
