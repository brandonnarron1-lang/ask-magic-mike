import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "scripts/capture_black_diamond.py"),
  "utf8",
);

describe("black-diamond visual capture safety", () => {
  it("intercepts every page-triggered write route and labels the synthetic identity", () => {
    const mainStart = source.indexOf("def main():");
    const installCall = source.indexOf("install_no_write_routes(page)", mainStart);
    const firstNavigation = source.indexOf('goto(page, "/")', mainStart);

    expect(source).toContain('page.route(');
    expect(source).toContain('"**/api/events"');
    expect(source).toContain('"**/api/experiments/event"');
    expect(source).toContain('"**/api/leads"');
    expect(source).toContain('"recorded": False');
    expect(source).toContain('"test_intercepted": True');
    expect(source).toContain('"lead_id": "internal-qa-no-write"');
    expect(source).toContain('"INTERNAL QA DO NOT CONTACT"');
    expect(source).toContain('"internal-qa@example.test"');
    expect(mainStart).toBeGreaterThan(-1);
    expect(installCall).toBeGreaterThan(mainStart);
    expect(installCall).toBeLessThan(firstNavigation);
  });
});
