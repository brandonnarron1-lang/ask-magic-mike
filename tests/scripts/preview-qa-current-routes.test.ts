import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/preview-qa.mjs", "utf8");
const previewWorkflow = readFileSync(".github/workflows/preview-qa.yml", "utf8");
const dispatchWorkflow = readFileSync(".github/workflows/preview-qa-dispatch.yml", "utf8");
const playwrightConfig = readFileSync("playwright.config.ts", "utf8");
const previewTestConfig = readFileSync("tests/e2e/preview-test-config.ts", "utf8");

describe("preview QA current route contract", () => {
  it("probes the active Lead Center surfaces with Basic Auth", () => {
    expect(source).toContain('http("GET", "/admin"');
    expect(source).toContain('http("GET", "/admin/leads?filter=active"');
    expect(source).toContain("adminBasicHeaders()");
    expect(source).not.toContain('http("GET", "/api/admin/dashboard"');
    expect(source).not.toContain('http("GET", "/api/admin/leads?limit=5"');
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

  it("requires durable IDs and authenticated readback for controlled mutation QA", () => {
    expect(source).toContain('name: "INTERNAL QA — DO NOT CONTACT"');
    expect(source).toContain("is_test: true");
    expect(source).toContain('typeof note.json?.message_id === "string"');
    expect(source).toContain('typeof task.json?.task_id === "string"');
    expect(source).toContain('http("GET", `/api/admin/leads/${leadId}`');
    expect(source).toContain('record(\n    "mutation:persistence_readback"');
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
    for (const workflow of [previewWorkflow, dispatchWorkflow]) {
      const doctor = workflow.indexOf("npm run release:doctor");
      const authority = workflow.indexOf("npm run launch:authority");
      const strictAssert = workflow.indexOf("npm run release:assert");

      expect(doctor).toBeGreaterThan(-1);
      expect(authority).toBeGreaterThan(doctor);
      expect(strictAssert).toBeGreaterThan(authority);
      expect(workflow).toContain('REQUIRE_VERDICT: "PREVIEW_READY"');
      expect(workflow).toContain('SAFE_DB_WRITE: "false"');
    }
  });
});
