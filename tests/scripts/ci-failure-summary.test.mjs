import { describe, expect, it } from "vitest";
import {
  buildCiFailureSummary,
  REQUIRED_CI_FAILURE_FIELDS,
} from "../../scripts/lib/ci-failure-summary.mjs";

describe("required CI failure summary", () => {
  it("renders every stable field and neutralizes multiline table injection", () => {
    const values = Object.fromEntries(
      REQUIRED_CI_FAILURE_FIELDS.map((field) => [field, `${field}\nvalue|safe`]),
    );
    const markdown = buildCiFailureSummary(values);

    for (const field of REQUIRED_CI_FAILURE_FIELDS) expect(markdown).toContain(field);
    expect(markdown).not.toContain("\nvalue|safe");
    expect(markdown).toContain("value\\|safe");
  });
});
