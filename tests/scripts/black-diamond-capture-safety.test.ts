import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "scripts/capture_black_diamond.py"),
  "utf8",
);

describe("black-diamond visual capture safety", () => {
  it("intercepts lead creation and labels the synthetic identity", () => {
    expect(source).toContain('page.route(');
    expect(source).toContain('"**/api/leads"');
    expect(source).toContain('"lead_id": "internal-qa-no-write"');
    expect(source).toContain('"INTERNAL QA DO NOT CONTACT"');
    expect(source).toContain('"internal-qa@example.test"');
  });
});
