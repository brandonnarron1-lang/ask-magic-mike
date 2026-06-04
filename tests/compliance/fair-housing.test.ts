import { describe, expect, it } from "vitest";
import { scanForFairHousingIssues } from "@/lib/compliance/fair-housing";

describe("scanForFairHousingIssues", () => {
  it("passes neutral property-feature copy", () => {
    const r = scanForFairHousingIssues(
      "4 bed, 2 bath updated home with finished basement and a fenced yard."
    );
    expect(r.passes).toBe(true);
    expect(r.findings).toHaveLength(0);
  });

  it("flags 'ideal for a family' as person-targeting", () => {
    const r = scanForFairHousingIssues("Ideal for a family near the schools.");
    expect(r.passes).toBe(false);
    expect(r.findings.some((f) => f.code === "ideal_person_language")).toBe(
      true
    );
  });

  it("flags 'no section 8' as protected-class signaling", () => {
    const r = scanForFairHousingIssues("No section 8 — sorry.");
    expect(r.passes).toBe(false);
  });

  it("flags 'adults only' / 'empty nesters preferred'", () => {
    expect(scanForFairHousingIssues("Adults only.").passes).toBe(false);
    expect(
      scanForFairHousingIssues("Empty nesters preferred — quiet street.").passes
    ).toBe(false);
  });

  it("does not flag plain mentions of religion/race in factual context", () => {
    const r = scanForFairHousingIssues(
      "Walking distance to grocery, gym, and a community center."
    );
    expect(r.passes).toBe(true);
  });
});
