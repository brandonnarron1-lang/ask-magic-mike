import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specPath = "tests/e2e/widget-preview-flow.spec.ts";
const interceptionPath = "tests/e2e/no-write-preview-interception.ts";
const source = readFileSync(specPath, "utf8");
const interception = readFileSync(interceptionPath, "utf8");

describe("widget Preview browser no-write contract", () => {
  it("uses one fail-closed boundary for every first-party API mutation", () => {
    expect(source).toContain(
      'import { installNoWriteInterception } from "./no-write-preview-interception"',
    );
    expect(interception).toContain('page.route("**/api/**"');
    expect(interception).toContain(
      'new Set(["POST", "PUT", "PATCH", "DELETE"])',
    );
    for (const endpoint of [
      "/api/leads",
      "/api/events",
      "/api/analytics/event",
      "/api/experiments/event",
    ]) {
      expect(interception).toContain(`pathname === "${endpoint}"`);
    }
    expect(interception).toContain("unexpectedMutations.push");
    expect(interception).toContain("unexpected_preview_write_blocked");
    expect(interception).not.toContain("route.continue(");
  });

  it("installs the fail-closed boundary before every scenario navigates", () => {
    const installs = [...source.matchAll(/installNoWriteInterception\(page/g)].map(
      (match) => match.index,
    );
    const navigations = [...source.matchAll(/page\.goto\(/g)].map(
      (match) => match.index,
    );

    expect(installs).toHaveLength(3);
    expect(navigations).toHaveLength(3);
    for (let index = 0; index < navigations.length; index += 1) {
      expect(installs[index]).toBeLessThan(navigations[index]);
    }
  });
});
