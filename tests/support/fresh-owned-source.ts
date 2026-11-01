import { approvedPublicPassages, approvedPublicSources } from "../../src/lib/intelligence/public-knowledge";

/** A NEW synthetic observation for isolated tests, not a refresh or approval of
 * the bundled/Production source. Preserve rights and wording; stamp only the
 * test observation. Negative freshness cases must supply their own old date. */
export function freshSyntheticSourceSnapshot(observedAt = new Date()) {
  return {
    source: { ...structuredClone(approvedPublicSources[0]), fetchedAt: observedAt.toISOString() },
    passages: structuredClone(approvedPublicPassages),
  };
}
