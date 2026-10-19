import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { test, expect, type Page } from "@playwright/test";
import { experienceContract } from "../../app/lib/experienceContract";
import { createGuestSessionAdapter, type NativeFetch } from "../../clients/native/nativeHttp";
import { R2Client } from "../../clients/native/transport";
import { sessionStore } from "../../clients/native/localPlan";
import { nativeLoopbackFetch } from "../support/native-http-fetch";

test.skip(process.env.AMM_R3_NATIVE_ACCEPTANCE !== "1" || process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1", "Owned local PostgreSQL, real sessions and no-send app required");
test.describe.configure({ mode: "serial" });
let pool: Pool, admin: Page, client: R2Client, currentSource: { id: string; revision: number; active_version: string };
let baseline: Record<string, number>;
let loseNextFeedbackAcknowledgment = false;
const calls: Array<{ path: string; method: string; origin: boolean }> = [];
const store = sessionStore(); // Memory fixture; NOT native storage evidence.
const scope = randomUUID();
const query = async (sql: string, values: unknown[] = []) => (await pool.query(sql, values)).rows;
const counts = async () => (await query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM tasks) tasks,(SELECT count(*)::int FROM lead_appointments) appointments,(SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM consents) consents"))[0];
async function source(action: string, versionId?: string) {
  const state = await admin.evaluate(async () => (await (await fetch("/api/admin/intelligence/sources", { cache: "no-store" })).json()).sources[0]);
  const result = await admin.evaluate(async body => {
    const r = await fetch("/api/admin/intelligence/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, { action, sourceId: "ourtown-experience", revision: state?.revision || 0, requestId: randomUUID(), ...(versionId ? { versionId } : {}), reason: "SYNTHETIC local native contract setup; no new rights" });
  expect(result.status).toBe(200); expect(result.body.ok).toBe(true); return result.body;
}
test.beforeAll(async ({ browser, baseURL }) => {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/amm_qa_upgrade" || process.env.VERCEL_ENV !== "development" || process.env.OPENAI_API_KEY || process.env.EMAIL_ENABLED !== "false") throw Error("owned_no_send_venue_required");
  pool = new Pool({ connectionString: url.href, max: 3 }); baseline = await counts();
  await query("INSERT INTO isolated_source_feed(id,body) VALUES(true,$1::jsonb)", [JSON.stringify(experienceContract)]);
  admin = await browser.newPage({ baseURL });
  await admin.goto("/lead-center-login?returnTo=%2Fadmin%2Factivity");
  await admin.getByLabel("Work email").fill("admin@example.test");
  await admin.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await admin.getByRole("button", { name: "Open Lead Center", exact: true }).click();
  await expect(admin).toHaveURL(/\/admin\/activity$/);
  await source("register"); const candidate = await source("refresh"); await source("validate", candidate.versionId); await source("promote", candidate.versionId);
  currentSource = await admin.evaluate(async () => (await (await fetch("/api/admin/intelligence/sources")).json()).sources[0]);
  const origin = `http://127.0.0.1:${new URL(baseURL!).port}`;
  // Physical identity was independently written/verified by the owned harness;
  // this receipt reference is a fixture selector, never server authentication.
  const identityBytes = readFileSync(process.env.AMM_SESSION_ARTIFACT_DIR + "/database-identity.json");
  const identity = JSON.parse(identityBytes.toString("utf8"));
  expect(identity.database).toBe("amm_qa_upgrade"); expect(identity.leadsBeforeFixtures).toBe(0);
  const descriptor = { kind: "verified-local-loopback" as const, platform: "ios" as const, origin, localScopeId: scope, expiresAt: Date.now() + 3600000, verificationReceipt: "local-postgres:" + createHash("sha256").update(identityBytes).digest("hex") };
  const nativeFetch: NativeFetch = async (url, init) => {
    calls.push({ path: new URL(url).pathname, method: init.method, origin: Object.keys(init.headers).some(k => k.toLowerCase() === "origin") });
    const response = await nativeLoopbackFetch(url, init);
    if (loseNextFeedbackAcknowledgment && new URL(url).pathname === "/api/native/v1/feedback" && init.method === "POST") {
      loseNextFeedbackAcknowledgment = false;
      expect(response.status).toBe(200); // Canonical server transaction really committed.
      await response.body?.getReader().cancel();
      throw Error("SYNTHETIC lost client acknowledgment after genuine committed response");
    }
    return response;
  };
  const adapter = createGuestSessionAdapter(descriptor, store, nativeFetch);
  client = new R2Client(store, { ...descriptor, session: adapter }, randomUUID);
  await client.restore(); expect(calls).toHaveLength(0);
});
test.afterAll(async () => { if (pool) { expect(await counts()).toEqual(baseline); await pool.end(); } await admin?.close(); });

test("fresh native guest → governed cited answer → scoped CSRF → durable exact feedback, without spoofed browser headers", async () => {
  await client.ask("How do I buy a home?");
  const answer = client.snapshot().answer!;
  expect(answer.currentSourceValidity).toBe("valid"); expect(answer.citations).toHaveLength(1); expect(answer.sourceRefs[0].versionId).toBe(currentSource.active_version);
  await client.feedback("helpful");
  expect(client.snapshot().feedback[0]).toMatchObject({ kind: "helpful", status: "open" });
  expect(calls.map(c => [c.path, c.method])).toEqual([["/api/chat/message", "POST"], ["/api/native/v1/feedback-token", "GET"], ["/api/native/v1/feedback", "POST"]]);
  expect(calls.every(c => !c.origin)).toBe(true);
  expect(await query("SELECT kind,count(*)::int n FROM intelligence_answer_feedback WHERE answer_id=$1 GROUP BY kind", [answer.answerId])).toEqual([{ kind: "helpful", n: 1 }]);
  expect(await query("SELECT count(*)::int n FROM r2_guest_sessions")).toEqual([{ n: 1 }]);
});
test("reload/recheck uses the same own receipt, and a second local scope has no answer access", async () => {
  client.hideAnswer(); await client.recheck();
  expect(client.snapshot().feedback).toHaveLength(1); expect(client.snapshot().answer?.currentSourceValidity).toBe("valid");
  const id = client.snapshot().receipt!.answerId;
  const response = await nativeLoopbackFetch(`http://127.0.0.1:${process.env.AMM_E2E_PORT}/api/native/v1/feedback-token?answerId=${id}&revision=1`, { method: "GET", headers: {}, credentials: "omit", redirect: "manual", signal: AbortSignal.timeout(12000) });
  expect(response.status).toBe(404); expect((await new Response(response.body as ReadableStream<Uint8Array>).json()).error).toBe("answer_not_found");
  expect(response.headers.get("set-cookie")).toBeNull(); expect(response.headers.get("cache-control")).toContain("no-store");
});
test("lost report acknowledgment is reconciled by exact replay after genuine staff reclassification", async () => {
  loseNextFeedbackAcknowledgment = true;
  await expect(client.feedback("report", "incorrect_claim")).rejects.toThrow();
  const pending = client.snapshot().pending!;
  expect(pending.category).toBe("incorrect_claim");
  const [report] = await query("SELECT id,revision FROM intelligence_answer_feedback WHERE kind='report'");
  expect(report.revision).toBe(1);
  const review = await admin.evaluate(async body => {
    const r = await fetch("/api/admin/intelligence/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, { feedbackId: report.id, expectedRevision: report.revision, requestId: randomUUID(), action: "classify", category: "unsupported_citation" });
  expect(review.status).toBe(200); expect(review.body.ok).toBe(true);
  await client.retryFeedback(); expect(client.snapshot().pending).toBeNull();
  expect(client.snapshot().feedback).toContainEqual(expect.objectContaining({ kind: "report", category: "unsupported_citation", revision: 2 }));
  await client.recheck(); expect(client.snapshot().feedback).toHaveLength(2);
  expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 2 }]);
});
test("source revocation suppresses the prior native answer without erasing its feedback or inventing an outcome", async () => {
  await source("revoke_source"); await expect(client.recheck()).rejects.toThrow();
  expect(client.snapshot().answer).toBeNull(); expect(client.snapshot().validity).toBe("source_invalid");
  expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 2 }]);
  await source("recover", currentSource.active_version);
  // Recovery advances authorization revision; historical answer references do
  // not regain validity. A separate deliberate request receives a NEW receipt.
  await expect(client.recheck()).rejects.toThrow(); expect(client.snapshot().answer).toBeNull();
  const oldId = client.snapshot().receipt!.answerId;
  await client.ask("How do I buy a home?");
  expect(client.snapshot().answer?.currentSourceValidity).toBe("valid"); expect(client.snapshot().receipt!.answerId).not.toBe(oldId);
});
test("a revoked guest cannot submit a pending new native report; current record remains singular", async () => {
  await query("UPDATE r2_guest_sessions SET revoked_at=now() WHERE revoked_at IS NULL");
  await expect(client.feedback("report", "handoff_issue")).rejects.toThrow();
  expect(client.snapshot().answer).toBeNull(); expect(client.snapshot().pending?.kind).toBe("report");
  expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 2 }]);
  expect(calls.at(-1)?.path).toBe("/api/native/v1/feedback-token");
  expect(await counts()).toEqual(baseline);
});
