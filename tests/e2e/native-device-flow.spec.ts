import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { test, expect, type Page } from "@playwright/test";
import { experienceContract } from "../../app/lib/experienceContract";
import { android, assertOwnedAndroid, androidOpen, androidVendorStartup, androidTap, androidEnter, androidVisible, androidScreenshot, hierarchy } from "../support/android-native-ui";

test.skip(process.env.AMM_R3_NATIVE_DEVICE_ACCEPTANCE !== "1" || process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1", "Dedicated owned native device and fresh local no-send PostgreSQL required");
test.describe.configure({ mode: "serial", timeout: 180000 });
let pool: Pool, admin: Page, metro: ChildProcess, metroPort = 0, baseline: Record<string, number>;
const dir = process.env.AMM_SESSION_ARTIFACT_DIR!;
const stages: unknown[] = [];
const query = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows;
const counts = async () => (await query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM tasks) tasks,(SELECT count(*)::int FROM lead_appointments) appointments,(SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM consents) consents"))[0];
function stage(name: string, facts: Record<string, unknown> = {}) {
  const value = { at: new Date().toISOString(), name, ...facts }; stages.push(value);
  writeFileSync(join(dir, "native-stages.json"), JSON.stringify(stages, null, 2), { mode: 0o600 }); console.log(JSON.stringify(value));
}
test.beforeAll(async ({ browser, baseURL }) => {
  const db = new URL(process.env.DATABASE_URL!);
  if (db.hostname !== "localhost" || db.pathname !== "/amm_qa_upgrade" || process.env.OPENAI_API_KEY || process.env.EMAIL_ENABLED !== "false" || process.env.VERCEL_ENV !== "development") throw Error("owned_no_send_native_venue_required");
  const device = assertOwnedAndroid(); pool = new Pool({ connectionString: db.href, max: 3 }); baseline = await counts();
  await query("INSERT INTO isolated_source_feed(id,body) VALUES(true,$1::jsonb)", [JSON.stringify(experienceContract)]);
  admin = await browser.newPage({ baseURL }); await admin.goto("/lead-center-login?returnTo=%2Fadmin%2Factivity");
  await admin.getByLabel("Work email").fill("admin@example.test"); await admin.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await admin.getByRole("button", { name: "Open Lead Center", exact: true }).click(); await expect(admin).toHaveURL(/\/admin\/activity$/);
  for (const action of ["register", "refresh", "validate", "promote"]) {
    const source = await admin.evaluate(async () => (await (await fetch("/api/admin/intelligence/sources")).json()).sources[0]);
    const result = await admin.evaluate(async body => {
      const r = await fetch("/api/admin/intelligence/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json() };
    }, { action, sourceId: "ourtown-experience", revision: source?.revision || 0, requestId: randomUUID(), ...(["validate", "promote"].includes(action) ? { versionId: source.versions[0].id } : {}), reason: "SYNTHETIC native device fixture setup" });
    expect(result.status).toBe(200); expect(result.data.ok).toBe(true);
  }
  const bytes = readFileSync(join(dir, "database-identity.json")), identity = JSON.parse(bytes.toString("utf8"));
  expect(identity.database).toBe("amm_qa_upgrade"); expect(identity.leadsBeforeFixtures).toBe(0);
  const descriptor = { kind: "verified-local-loopback", iosOrigin: `http://127.0.0.1:${new URL(baseURL!).port}`, androidOrigin: `http://10.0.2.2:${new URL(baseURL!).port}`,
    localScopeId: randomUUID(), expiresAt: Date.now() + 3600000, verificationReceipt: "local-postgres:" + createHash("sha256").update(bytes).digest("hex") };
  const reserve = createServer(); await new Promise<void>(done => reserve.listen(0, "127.0.0.1", done)); metroPort = (reserve.address() as { port: number }).port; await new Promise<void>(done => reserve.close(() => done()));
  const log = join(dir, "metro.log"); writeFileSync(log, "", { mode: 0o600 });
  // Only this public synthetic descriptor reaches Metro. No DB URL, staff
  // password, cookies, model key or other parent process environment is copied.
  metro = spawn(process.execPath, ["node_modules/expo/bin/cli", "start", "--go", "--localhost", "--max-workers", "1", "--port", String(metroPort)], {
    // The server globally augments ProcessEnv with required secret names. A
    // native compiler process intentionally omits them; never fill those types
    // by copying the server environment. This cast adds no runtime values.
    cwd: resolve("clients/native"), env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_OPTIONS: "--dns-result-order=ipv4first", LANG: "en_US.UTF-8", CI: "1", EXPO_OFFLINE: "1", EXPO_NO_TELEMETRY: "1", EXPO_NO_DOTENV: "1", EXPO_PUBLIC_AMM_NATIVE_QA_BINDING: JSON.stringify(descriptor) } as unknown as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [metro.stdout, metro.stderr]) stream!.on("data", data => appendFileSync(log, data));
  await expect.poll(async () => { try { return (await fetch(`http://127.0.0.1:${metroPort}/status`)).status; } catch { return 0; } }, { timeout: 30000 }).toBe(200);
  android(["shell", "settings", "put", "system", "font_scale", "1"]);
  stage("VENUE_VERIFIED", { device, descriptor, database: identity.database, noProductionCredentials: true, automaticMessages: false });
  androidOpen(metroPort, true); stage("ANDROID_VENDOR_HOST_LAUNCHED", { metroPort, ownBinaryCompiled: false });
  await androidVendorStartup();
});
test.afterAll(async () => {
  try { androidScreenshot(join(dir, "android-final.png")); writeFileSync(join(dir, "android-final.xml"), hierarchy().xml, { mode: 0o600 }); } catch { /* Failure context only, never a pass assertion. */ }
  if (metro && metro.exitCode === null) { metro.kill("SIGTERM"); await new Promise(resolve => { metro.once("exit", resolve); setTimeout(resolve, 3000); }); }
  if (pool) { expect(await counts()).toEqual(baseline); await pool.end(); } await admin?.close();
});

test("native private saved comparison and plan survive actual device-host restart", async () => {
  await androidVisible("Your next step, at your pace", { timeoutMs: 60000 }); androidScreenshot(join(dir, "android-home.png"));
  // Only this dedicated synthetic host is allowed. Clear the prior run's local
  // plan through the real UI, not a storage shortcut or an arbitrary device reset.
  await androidTap("My Plan"); await androidTap("Delete local saved interests + plan", true);
  await androidTap("Home"); await androidVisible("Saved interests: 0. Seller preparation: 0 of 3 steps checked by you.");
  await androidTap("Saved"); await androidVisible("Saved interests"); await androidEnter("Desired area (500 characters)", "SYNTHETIC Wilson"); await androidTap("Save locally — sends nothing", true);
  await androidVisible("SYNTHETIC Wilson", { scroll: true });
  await androidTap("Saved"); await androidEnter("Desired area (500 characters)", "SYNTHETIC Elm City"); await androidTap("Save locally — sends nothing", true);
  await androidTap("Select for comparison", true); await androidTap("Select for comparison", true);
  await androidVisible("Comparison — your declarations only", { scroll: true }); androidScreenshot(join(dir, "android-comparison.png"));
  await androidTap("My Plan"); await androidEnter("Buying needs (1,000 characters; one paragraph)", "SYNTHETIC yard preference"); await androidTap("Save my plan locally", true);
  androidOpen(metroPort, true); await androidVisible("Your next step, at your pace", { timeoutMs: 30000 });
  await androidTap("My Plan"); await androidVisible("SYNTHETIC yard preference", { scroll: true });
  await androidTap("Saved"); await androidVisible("SYNTHETIC Wilson", { scroll: true }); await androidVisible("SYNTHETIC Elm City", { scroll: true });
  stage("PRIVATE_COMPARISON_PLAN_RESTART_PASS", { savedInterests: 2, deviceStorage: "actual Expo SecureStore", customerData: false, sync: false });
});
test("actual native answer/citation and feedback reach the shared scoped API, then restore by receipt", async () => {
  await androidTap("Ask Mike"); await androidEnter("Public process question (2,000 characters)", "How do I buy a home"); await androidTap("Ask Mike’s assistant", true);
  await androidVisible("Source-supported guidance", { scroll: true }); await androidVisible("Our Town: approved service and intake requirements", { scroll: true });
  androidScreenshot(join(dir, "android-cited-answer.png"));
  await androidTap("Helpful", true);
  await expect.poll(async () => (await query("SELECT count(*)::int n FROM intelligence_answer_feedback WHERE kind='helpful'"))[0].n).toBe(1);
  await androidVisible("Recorded: helpful · open · review revision 1", { scroll: true }); androidScreenshot(join(dir, "android-feedback.png"));
  androidOpen(metroPort, true); await androidVisible("Your next step, at your pace", { timeoutMs: 30000 }); await androidTap("Ask Mike");
  await androidTap("Recheck saved answer + feedback", true); await androidVisible("Recorded: helpful · open · review revision 1", { scroll: true });
  expect(await query("SELECT count(*)::int n FROM r2_guest_sessions")).toEqual([{ n: 1 }]);
  expect(await query("SELECT count(*)::int n FROM intelligence_answers")).toEqual([{ n: 1 }]);
  expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 1 }]);
  expect(await counts()).toEqual(baseline);
  stage("NATIVE_ANSWER_CITATION_FEEDBACK_RESTART_PASS", { guestSessions: 1, answers: 1, feedback: 1, paidModelCalls: 0, operationalDeltas: 0, handoff: "affordance only; public form not submitted" });
});
test("native enlarged text and revoked-session UI keep local data usable without stale answers", async () => {
  await query("UPDATE r2_guest_sessions SET revoked_at=now() WHERE revoked_at IS NULL");
  await androidTap("Home"); await androidTap("Ask Mike"); await androidTap("Recheck saved answer + feedback", true);
  await androidVisible("Answer unavailable or unverified. Recheck explicitly. Asking again is a new request, not a recovered receipt.", { scroll: false });
  expect(hierarchy().nodes.some(n => n.text === "Source-supported guidance")).toBe(false);
  android(["shell", "settings", "put", "system", "font_scale", "2"]);
  await androidTap("My Plan"); await androidVisible("SYNTHETIC yard preference", { scroll: true });
  const control = await androidVisible("Save my plan locally", { scroll: true });
  expect(control.enabled).not.toBe("false"); androidScreenshot(join(dir, "android-plan-200percent.png"));
  expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback")).toEqual([{ n: 1 }]);
  expect(await counts()).toEqual(baseline);
  stage("NATIVE_REVOCATION_AND_200PERCENT_TEXT_PASS", { fontScale: 2, staleAnswerHidden: true, localPlanRetained: true, automaticContact: false });
});
