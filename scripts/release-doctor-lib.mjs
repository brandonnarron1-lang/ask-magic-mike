/**
 * Pure helpers for the release-doctor script.
 *
 * Doctor checks fall into two buckets:
 *   - blocking — failure means "do not push", "do not merge"
 *   - advisory — failure means "fix before promotion", but does not
 *     prevent local iteration
 *
 * Each check returns { id, status, blocking, message, details? }.
 */

/**
 * Decide doctor's exit status from a list of check results.
 *
 * Returns 0 only when every BLOCKING check passes.
 *
 * @param {Array<{status: "pass"|"fail"|"skip"; blocking: boolean}>} results
 */
export function decideExitCode(results) {
  for (const r of results) {
    if (r.blocking && r.status === "fail") return 1;
  }
  return 0;
}

/**
 * Build a stable summary object the release-doctor can serialize.
 *
 * @param {{
 *   git: { branch: string; clean: boolean; commit: string };
 *   results: Array<{ id: string; status: "pass"|"fail"|"skip"; blocking: boolean; message: string }>;
 *   generated_at: string;
 * }} input
 */
export function summarize(input) {
  const passing = input.results.filter((r) => r.status === "pass").length;
  const failing = input.results.filter((r) => r.status === "fail").length;
  const skipped = input.results.filter((r) => r.status === "skip").length;
  const blockingFailures = input.results
    .filter((r) => r.blocking && r.status === "fail")
    .map((r) => r.id);
  return {
    generated_at: input.generated_at,
    git: input.git,
    totals: { pass: passing, fail: failing, skip: skipped },
    blocking_failures: blockingFailures,
    healthy: blockingFailures.length === 0,
    results: input.results,
  };
}
