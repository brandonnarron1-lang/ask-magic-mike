import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/preview-qa.mjs", "utf8");
const previewWorkflow = readFileSync(".github/workflows/preview-qa.yml", "utf8");
const dispatchWorkflow = readFileSync(".github/workflows/preview-qa-dispatch.yml", "utf8");

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

  it("accepts only the explicit read-only Preview cron refusal", () => {
    expect(source).toContain('r.json?.error === "preview_data_disabled"');
    expect(source).toContain("authenticated cron request safely refused Preview data writes");
  });

  it("validates the private iOS install handoff without redeeming its token", () => {
    expect(source).toContain('ct.includes("application/json") || ct.includes("+json")');
    expect(source).toContain('http("POST", "/admin/api/phone-alerts/invite"');
    expect(source).toContain('const manifestPath = `${installUrl.pathname}/manifest.webmanifest`');
    expect(source).toContain('startUrl.pathname === "/phone-alerts/setup/claim"');
    expect(source).toContain('record("phone_install:handoff", "pass"');
    expect(source).toContain('private install contract failed: ${failedChecks || "unknown"}');
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
