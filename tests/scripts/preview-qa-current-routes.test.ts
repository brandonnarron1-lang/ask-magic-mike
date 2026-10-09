import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/preview-qa.mjs", "utf8");
const previewWorkflow = readFileSync(".github/workflows/preview-qa.yml", "utf8");
const playwrightConfig = readFileSync("playwright.config.ts", "utf8");
const previewTestConfig = readFileSync("tests/e2e/preview-test-config.ts", "utf8");

describe("preview QA current route contract", () => {
  it("probes genuine QA sessions while preserving the legacy non-RBAC venue contract", () => {
    expect(source).toContain('http("GET", "/admin"');
    expect(source).toContain('http("GET", "/admin/leads?filter=active"');
    expect(source).toContain("adminBasicHeaders()");
    expect(source).toContain('"admin:anonymous_dashboard_denied"');
    expect(source).toContain('"admin:anonymous_leads_denied"');
    expect(source).toContain('anonymousLeadCenterDenied(anonymousDash, PREVIEW_URL, "/admin")');
    expect(source).toContain('anonymousLeadCenterDenied(anonymousList, PREVIEW_URL, "/admin/leads?filter=active")');
    expect(source).toContain('"/api/lead-center-auth/sign-in/email"');
    expect(source).toContain('"/api/lead-center-auth/get-session"');
    expect(source).toContain('verified.json?.user?.role === "administrator"');
    expect(source).toContain('throw new Error("synthetic_QA_identity_required")');
    expect(source).toContain('if ((mode & 0o077) !== 0)');
    expect(source).toContain('dash.text.includes("Command Center")');
    expect(source).toContain('dash.text.includes("What needs attention today.")');
    expect(source).toContain('list.text.includes("Command Center")');
    expect(source).toContain('list.text.includes("Lead inbox and routing readiness")');
    expect(source).not.toContain('dash.text.includes("Lead Center")');
    expect(source).not.toContain('list.text.includes("Lead Center")');
    expect(source).not.toContain('http("GET", "/api/admin/dashboard"');
    expect(source).not.toContain('http("GET", "/api/admin/leads?limit=5"');
  });

  it("binds Preview runtime identity to the reviewed source SHA", () => {
    expect(source).toContain('http("GET", "/api/health/live"');
    expect(source).toContain('res.headers.get("x-amm-release-commit")');
    expect(source).toContain('parsed.headers["x-amm-release-commit"]');
    expect(source).toContain('record("release:runtime_identity", "pass"');
    expect(source).toContain("observed === EXPECTED_RELEASE_SHA");
  });

  it("checks the active address funnel instead of retired campaign prose", () => {
    expect(source).toContain('data-amm-step="address"');
    expect(source).toContain('"Property address"');
    expect(source).not.toContain('"Start with your address"');
    expect(source).not.toContain('"not an appraisal"');
  });

  it("fails Preview QA if an external analytics or consent runtime is rendered", () => {
    expect(source).toContain('record("preview:external_analytics_off", "pass"');
    expect(source).toContain('"googletagmanager.com/gtm.js"');
    expect(source).toContain('"GTM-KZMCSLTJ"');
    expect(source).toContain('data-testid="external-analytics-consent"');
    expect(source).toContain('await previewAnalyticsIsolation()');
  });

  it("does not reuse an unrelated local web server for Ask Magic Mike E2E", () => {
    expect(playwrightConfig).toContain('const LOCAL_E2E_PORT = process.env.AMM_E2E_PORT ?? "3210"');
    expect(playwrightConfig).toContain("reuseExistingServer: false");
    expect(playwrightConfig).not.toContain("reuseExistingServer: true");
    expect(previewTestConfig).toContain('const localE2ePort = process.env.AMM_E2E_PORT ?? "3210"');
    expect(previewTestConfig).toContain('`http://127.0.0.1:${localE2ePort}`');
    expect(previewTestConfig).not.toContain('"http://localhost:3000"');
  });

  it("classifies writes against the exact app origin while blocking every mutating request", () => {
    const e2eSource = readFileSync("tests/e2e/widget-preview-flow.spec.ts", "utf8");
    expect(e2eSource).toContain("requestUrl.origin === APPLICATION_ORIGIN");
    expect(e2eSource).toContain('["POST", "PUT", "PATCH", "DELETE"]');
    expect(e2eSource).toContain("await route.fulfill({");
    expect(e2eSource).not.toContain("await route.continue(");
  });

  it("accepts only the explicit read-only Preview cron refusal", () => {
    expect(source).toContain('r.json?.error === "preview_data_disabled"');
    expect(source).toContain("authenticated cron request safely refused Preview data writes");
  });

  it("uses a shell-free, temp-file Vercel CLI transport for protected local QA", () => {
    expect(source).toContain('PREVIEW_TRANSPORT=vercel_cli');
    expect(source).toContain('execFileAsync(\n      "vercel"');
    expect(source).toContain('await writeFile(configPath, config, { mode: 0o600 })');
    expect(source).toContain('await rm(tempDir, { recursive: true, force: true })');
    expect(source).not.toContain("shell: true");
  });

  it("requires durable IDs and authenticated readback for controlled mutation QA", () => {
    expect(source).toContain('name: "INTERNAL QA — DO NOT CONTACT"');
    expect(source).toContain("is_test: true");
    expect(source).toContain('typeof note.json?.message_id === "string"');
    expect(source).toContain('task.status === 409 && task.json?.error === "test_or_suppressed_task_held"');
    expect(source).toContain('detail.json?.lead?.is_test === true');
    expect(source).toContain('detail.json?.lead?.communication_suppressed === true');
    expect(source).toContain('stable PREVIEW_QA_RUN_ID required; no submission attempted');
    expect(source).toContain('email: `qa-${runId}@example.test`');
    expect(source).toContain('consent_sms: false');
    expect(source).toContain('http("GET", `/api/admin/leads/${leadId}`');
    expect(source).toContain('record(\n    "mutation:persistence_readback"');
  });

  it("does not exercise unsafe cron writes or pretend Preview callbacks were processed", () => {
    expect(source).toContain('cron GET persists; read-only run does not permit that probe');
    expect(source).toContain('"mutation:preview_sms_callback_refused"');
    expect(source).toContain('"mutation:preview_email_callback_refused"');
    expect(source).toContain('sms.status === 503 && sms.json?.error === "preview_data_disabled"');
    expect(source).toContain('email.status === 409 && email.json?.error === "webhook_disabled"');
    expect(source).toContain('throw new Error("preview_no_send_attestation_failed")');
  });

  it("validates the private iOS install failure contract without minting or redeeming a token", () => {
    expect(source).toContain('ct.includes("application/json") || ct.includes("+json")');
    expect(source).toContain('const installPath = "/phone-alerts/install/preview-qa-invalid-token"');
    expect(source).toContain('const manifestPath = `${installPath}/manifest.webmanifest`');
    expect(source).toContain('manifest.json?.error === "phone_setup_link_expired"');
    expect(source).toContain('record("phone_install:handoff", "pass"');
    expect(source).toContain('private install contract failed: ${failedChecks || "unknown"}');
    expect(source).not.toContain('http("POST", "/admin/api/phone-alerts/invite"');
    expect(source).not.toContain('http("GET", startUrl');
  });

  it("cannot report a green Preview workflow with blocked launch authority", () => {
    const doctor = previewWorkflow.indexOf("npm run release:doctor");
    const authority = previewWorkflow.indexOf("npm run launch:authority");
    const strictAssert = previewWorkflow.indexOf("npm run release:assert");

    expect(doctor).toBeGreaterThan(-1);
    expect(authority).toBeGreaterThan(doctor);
    expect(strictAssert).toBeGreaterThan(authority);
    expect(previewWorkflow).toContain('REQUIRE_VERDICT: "PREVIEW_READY"');
    expect(previewWorkflow).toContain('SAFE_DB_WRITE: "false"');
    expect(previewWorkflow).toContain("target_ref:");
    expect(previewWorkflow).toContain("ref: ${{ inputs.target_ref }}");
    expect(existsSync(".github/workflows/preview-qa-dispatch.yml")).toBe(false);
  });
});
