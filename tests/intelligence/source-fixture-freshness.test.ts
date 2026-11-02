import { describe, expect, it } from "vitest";
import { approvedPublicSources } from "../../src/lib/intelligence/public-knowledge";
import { validateSourceSnapshot } from "../../src/lib/intelligence/source-lifecycle";
import { freshSyntheticSourceSnapshot } from "../support/fresh-owned-source";

describe("isolated source observations do not expire with the bundled fixture", () => {
  const recorded = new Date(approvedPublicSources[0].fetchedAt);
  const now = new Date(+recorded + 361 * 3_600_000);
  it("still denies the old observation under the shorter freshness scope", () => {
    const old = freshSyntheticSourceSnapshot(recorded); old.source.freshnessHours = 360;
    expect(validateSourceSnapshot(old, now)).toMatchObject({ valid: false, reason: "Source dates,rights or freshness are ineligible" });
  });
  it("allows a new synthetic observation without changing retained grant/rights", () => {
    const before = structuredClone(approvedPublicSources[0]);
    const fresh = freshSyntheticSourceSnapshot(now); fresh.source.freshnessHours = 360;
    expect(validateSourceSnapshot(fresh, now)).toMatchObject({ valid: true });
    expect(fresh.source.permissions).toEqual(before.permissions);
    expect(fresh.source.grantReference).toBe(before.grantReference);
    expect(approvedPublicSources[0]).toEqual(before);
  });
});
