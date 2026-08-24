import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "tests/e2e/widget-preview-flow.spec.ts";
const source = readFileSync(path, "utf8");

describe("widget Preview browser no-write contract", () => {
  it("intercepts the lead and every public telemetry endpoint", () => {
    for (const endpoint of [
      "leads",
      "events",
      "analytics/event",
      "experiments/event",
      "widget/events",
    ]) {
      expect(source).toContain(`page.route("**/api/${endpoint}"`);
    }
    expect(source).toContain("persisted: false");
    expect(source).toContain("test_intercepted: true");
    expect(source).not.toContain("route.continue(");
  });

  it("installs telemetry interception before either scenario navigates", () => {
    const beforeEach = source.indexOf("test.beforeEach");
    const install = source.indexOf("installNoWriteTelemetryRoutes(page)", beforeEach);
    const navigation = source.indexOf('page.goto("/widget-preview")');

    expect(beforeEach).toBeGreaterThan(-1);
    expect(install).toBeGreaterThan(beforeEach);
    expect(install).toBeLessThan(navigation);
  });
});
