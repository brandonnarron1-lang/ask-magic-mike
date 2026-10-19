import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";
import { experienceContract } from "../../app/lib/experienceContract";

const platform = process.env.AMM_R3_NATIVE_BINARY_ACCEPTANCE;
test.skip(!["ios", "android"].includes(platform || "") || process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1", "Explicit own-binary UI observer and disposable local PostgreSQL required");
// This is a bounded SQL observer, NOT simulated device automation. A separate
// actual device driver supplies source-bound screenshots and UI assertions.
// Neither a marker nor these SQL assertions alone establishes a device pass.
test("own binary UI: scoped answer/feedback, restart and revoked-session observer", async ({ browser, baseURL }) => {
  test.setTimeout(2400000);
  const dir = resolve(process.env.AMM_SESSION_ARTIFACT_DIR!);
  const db = new URL(process.env.DATABASE_URL!);
  if (!dir.startsWith(resolve(".amm-run") + "/") || db.hostname !== "localhost" || db.pathname !== "/amm_qa_upgrade"
    || process.env.OPENAI_API_KEY || process.env.EMAIL_ENABLED !== "false" || process.env.VERCEL_ENV !== "development") throw Error("local_no_send_binary_venue_required");
  const pool = new Pool({ connectionString: db.href, max: 2 });
  const query = async (sql: string) => (await pool.query(sql)).rows;
  const counts = async () => (await query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM tasks) tasks,(SELECT count(*)::int FROM lead_appointments) appointments,(SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM consents) consents,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_ids"))[0];
  const baseline = await counts();
  const admin = await browser.newPage({ baseURL });
  const scope = randomUUID();
  const record = (name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value, null, 2), { mode: 0o600 });
  const waitUi = async (name: string) => {
    const path = join(dir, name);
    await expect.poll(() => existsSync(path), { timeout: 1100000, intervals: [1000] }).toBe(true);
    const proof = JSON.parse(readFileSync(path, "utf8"));
    expect(proof.scope).toBe(scope); expect(proof.platform).toBe(platform);
    expect(proof.binarySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.observation).toBe("actual-own-binary-ui");
    expect(proof.screenshots.length).toBeGreaterThan(0);
    for (const path of proof.screenshots) {
      if (typeof path !== "string" || !resolve(dir, path).startsWith(dir + "/")) throw Error("private_ui_proof_path_required");
      expect(existsSync(resolve(dir, path))).toBe(true);
    }
    return proof;
  };
  try {
    const identityBytes = readFileSync(join(dir, "database-identity.json"));
    const identity = JSON.parse(identityBytes.toString());
    expect(identity.leadsBeforeFixtures).toBe(0); expect(identity.nonSyntheticDirectory).toBe(0);
    await pool.query("INSERT INTO isolated_source_feed(id,body) VALUES(true,$1::jsonb)", [JSON.stringify(experienceContract)]);
    await admin.goto("/lead-center-login?returnTo=%2Fadmin%2Factivity");
    await admin.getByLabel("Work email").fill("admin@example.test");
    await admin.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
    await admin.getByRole("button", { name: "Open Lead Center", exact: true }).click();
    await expect(admin).toHaveURL(/\/admin\/activity$/);
    for (const action of ["register", "refresh", "validate", "promote"]) {
      const source = await admin.evaluate(async () => (await (await fetch("/api/admin/intelligence/sources")).json()).sources[0]);
      const result = await admin.evaluate(async body => {
        const r = await fetch("/api/admin/intelligence/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return { status: r.status, data: await r.json() };
      }, { action, sourceId: "ourtown-experience", revision: source?.revision || 0, requestId: randomUUID(), ...(["validate", "promote"].includes(action) ? { versionId: source.versions[0].id } : {}), reason: "SYNTHETIC own-binary fixture only; NOT Production human approval" });
      expect(result.status).toBe(200); expect(result.data.ok).toBe(true);
    }
    const descriptor = { kind: "verified-local-loopback", iosOrigin: `http://127.0.0.1:${new URL(baseURL!).port}`, androidOrigin: `http://10.0.2.2:${new URL(baseURL!).port}`,
      localScopeId: scope, expiresAt: Date.now() + 2400000, verificationReceipt: "local-postgres:" + createHash("sha256").update(identityBytes).digest("hex") };
    record("native-ready.json", { at: new Date().toISOString(), platform, descriptor, baseline, noSend: true, data: "fresh tracked schema and synthetic fixtures only", observer: "separate actual UI assertions required" });
    record("native-qa-descriptor.json", descriptor);
    const first = await waitUi("ui-feedback-complete.json");
    expect(first.assertions).toEqual(["saved-comparison-plan", "restart-persistence", "cited-answer", "feedback", "receipt-recheck"]);
    expect(await query("SELECT count(*)::int n FROM r2_guest_sessions")).toEqual([{ n: 1 }]);
    expect(await query("SELECT count(*)::int n FROM intelligence_answers")).toEqual([{ n: 1 }]);
    expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback WHERE kind='helpful'")).toEqual([{ n: 1 }]);
    expect(await counts()).toEqual(baseline);
    await query("UPDATE r2_guest_sessions SET revoked_at=now() WHERE revoked_at IS NULL");
    record("native-revoked.json", { at: new Date().toISOString(), scope, platform, affectedSyntheticGuests: 1 });
    const second = await waitUi("ui-revocation-complete.json");
    expect(second.binarySha256).toBe(first.binarySha256);
    expect(second.assertions).toEqual(["revoked-answer-hidden", "local-plan-retained", "no-automatic-retry"]);
    expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 1 }]);
    expect(await counts()).toEqual(baseline);
    record("native-binary-sql-receipt.json", { at: new Date().toISOString(), scope, platform, baseline, final: await counts(), syntheticGuests: 1, answers: 1, feedback: 1, paidCalls: 0, productionEffects: 0, status: "PASS_SQL_OBSERVER; actual UI proof separate", binarySha256: first.binarySha256 });
  } finally { await admin.close(); await pool.end(); }
});
