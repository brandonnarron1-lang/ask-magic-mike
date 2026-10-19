// @vitest-environment node
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ query: vi.fn(), viewer: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/intelligence/viewer", () => ({ readR2Viewer: mocks.viewer, r2Enabled: () => process.env.R2_SOURCE_GOVERNANCE_ENABLED === "true", r2Query: () => ({ query: mocks.query }) }));
vi.mock("@/lib/preview-security", () => ({ assertDatabaseMutationAllowed: mocks.mutation }));
import { issueNativeFeedbackToken, verifyNativeFeedbackToken, nativeRequestContext } from "../../src/lib/intelligence/native-feedback";
import { GET } from "../../app/api/native/v1/feedback-token/route";
import { POST } from "../../app/api/native/v1/feedback/route";

const origin = "https://synthetic.example.test";
const secret = "SYNTHETIC-ONLY-native-api-signing-test-secret";
const viewer = { ownerScope: "guest:" + "a".repeat(64), consumerUserId: null, consumerSessionId: null };
const ref = { answerId: randomUUID(), revision: 1 };
const payload = () => ({ ...ref, requestId: randomUUID(), kind: "helpful", category: null, comment: "" });
const token = () => issueNativeFeedbackToken(secret, origin, viewer, ref).token;
const getRequest = (headers: Record<string, string> = {}, suffix = "") => new NextRequest(`${origin}/api/native/v1/feedback-token?answerId=${ref.answerId}&revision=1${suffix}`, { headers });
function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(origin + "/api/native/v1/feedback", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
describe("native feedback adapter preserves current R2 authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("R2_SOURCE_GOVERNANCE_ENABLED", "true"); vi.stubEnv("BETTER_AUTH_SECRET", secret);
    mocks.viewer.mockResolvedValue(viewer); mocks.mutation.mockReturnValue({ ok: true });
    mocks.query.mockResolvedValue([{ feedback: [], result: { ok: true, replayed: false, feedback: { id: randomUUID() } } }]);
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, "false", "TRUE"])("never turns on an unavailable R2 service (%s)", async value => {
    vi.stubEnv("R2_SOURCE_GOVERNANCE_ENABLED", value);
    expect((await GET(getRequest())).status).toBe(404); expect((await POST(postRequest(payload()))).status).toBe(404);
    expect(mocks.viewer).not.toHaveBeenCalled(); expect(mocks.query).not.toHaveBeenCalled();
  });
  it.each([["origin", origin], ["origin", "null"], ["origin", "https://evil.invalid"], ["referer", origin],
    ["sec-fetch-site", "none"], ["sec-fetch-site", "same-origin"], ["sec-fetch-site", "cross-site"], ["sec-fetch-mode", "cors"], ["sec-fetch-dest", "empty"]])("refuses browser context %s=%s without SQL", async (name, value) => {
    const headers = { [name]: value };
    expect(nativeRequestContext(getRequest(headers))).toBe(false);
    expect((await GET(getRequest(headers))).status).toBe(403);
    expect((await POST(postRequest(payload(), { ...headers, "x-amm-feedback-csrf": token() }))).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.viewer).not.toHaveBeenCalled();
  });
  it("issues only an own-answer CSRF proof; GET never mints a session or mutates", async () => {
    const response = await GET(getRequest()); const body = await response.json();
    expect(response.status).toBe(200); expect(body.ok).toBe(true);
    expect(verifyNativeFeedbackToken(body.token, secret, origin, viewer, ref)).toBe(true);
    expect(mocks.query.mock.calls).toHaveLength(1);
    expect(mocks.query.mock.calls[0]).toEqual(["SELECT public.read_r2_feedback_v1($1::uuid,$2,$3,$4,$5) AS feedback", [ref.answerId, 1, viewer.ownerScope, null, null]]);
    expect(mocks.mutation).not.toHaveBeenCalled(); expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(JSON.stringify(body)).not.toContain(viewer.ownerScope);
  });
  it("has no copied-answer oracle for a missing viewer or unknown own answer", async () => {
    mocks.viewer.mockResolvedValueOnce(null);
    const absent = await GET(getRequest());
    mocks.query.mockResolvedValueOnce([{ feedback: null }]);
    const copied = await GET(getRequest());
    expect(absent.status).toBe(404); expect(copied.status).toBe(404);
    expect(await absent.json()).toEqual(await copied.json());
  });
  it("refuses malformed references and weak/missing server secret", async () => {
    expect((await GET(getRequest({}, "&ownerScope=forged"))).status).toBe(400);
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    expect((await GET(getRequest())).status).toBe(503);
    expect((await POST(postRequest(payload(), { "x-amm-feedback-csrf": token() }))).status).toBe(403);
  });
  it("checks Preview mutation protection before parsing or storage", async () => {
    mocks.mutation.mockReturnValue({ ok: false, error: "preview_data_disabled", statusCode: 503 });
    expect((await POST(postRequest(payload()))).status).toBe(503);
    expect(mocks.viewer).not.toHaveBeenCalled(); expect(mocks.query).not.toHaveBeenCalled();
  });
  it("rejects bad content type, declared/streamed oversize, forged scope and long comments", async () => {
    for (const [body, headers, status] of [[payload(), { "content-type": "text/plain" }, 415], [payload(), { "content-length": "20000" }, 413],
      [{ ...payload(), comment: "x".repeat(20000) }, {}, 413], [{ ...payload(), kind: "report", category: "other", comment: "x".repeat(2001) }, {}, 400],
      [{ ...payload(), ownerScope: viewer.ownerScope }, {}, 400]] as const) {
      expect((await POST(postRequest(body, headers))).status).toBe(status);
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("missing, changed-session, changed-answer and changed-origin CSRF proofs do not submit", async () => {
    const issued = token();
    for (const value of [undefined, "forged", issued + "x"]) expect((await POST(postRequest(payload(), value ? { "x-amm-feedback-csrf": value } : {}))).status).toBe(403);
    mocks.viewer.mockResolvedValueOnce({ ...viewer, ownerScope: "guest:" + "b".repeat(64) });
    expect((await POST(postRequest(payload(), { "x-amm-feedback-csrf": issued }))).status).toBe(403);
    expect((await POST(postRequest({ ...payload(), revision: 2 }, { "x-amm-feedback-csrf": issued }))).status).toBe(403);
    expect(verifyNativeFeedbackToken(issued, secret, "https://other.invalid", viewer, ref)).toBe(false);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("revoked access cannot use a previously issued proof", async () => {
    const proof = token(); mocks.viewer.mockResolvedValueOnce(null);
    expect((await POST(postRequest(payload(), { "x-amm-feedback-csrf": proof }))).status).toBe(404);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("delegates once to exact canonical service; replay identity/payload and no-send effects stay unchanged", async () => {
    const input = payload(), proof = token();
    const response = await POST(postRequest(input, { "x-amm-feedback-csrf": proof }));
    expect(response.status).toBe(200); expect(mocks.query.mock.calls).toHaveLength(1);
    expect(mocks.query.mock.calls[0][0]).toContain("public.submit_r2_feedback_v1");
    expect(mocks.query.mock.calls[0][1].slice(0, 6)).toEqual([ref.answerId, 1, viewer.ownerScope, null, null, input.requestId]);
    mocks.query.mockResolvedValueOnce([{ result: { ok: true, replayed: true } }]);
    expect(await (await POST(postRequest(input, { "x-amm-feedback-csrf": proof }))).json()).toMatchObject({ ok: true, replayed: true });
    expect(mocks.query.mock.calls[0][1]).toEqual(mocks.query.mock.calls[1][1]);
    expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.has("set-cookie")).toBe(false);
  });
  it.each([["answer_not_found", 404], ["feedback_rate_limited", 429], ["feedback_replay_conflict", 409], ["feedback_unavailable", 503]])("preserves canonical failure %s", async (error, status) => {
    mocks.query.mockResolvedValueOnce([{ result: { ok: false, error } }]);
    expect((await POST(postRequest(payload(), { "x-amm-feedback-csrf": token() }))).status).toBe(status);
  });
  it("never exposes signing/session/storage exceptions", async () => {
    mocks.query.mockRejectedValue(Error("private-secret-never-return"));
    const response = await POST(postRequest(payload(), { "x-amm-feedback-csrf": token() }));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-secret");
  });
});
