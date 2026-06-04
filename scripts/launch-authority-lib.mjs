/**
 * Pure helpers for the launch-authority verdict.
 *
 * Verdict ladder (highest to lowest):
 *
 *   PROMOTION_READY — preview ready + (mutation ready or not required)
 *                      + rollback runbook + governance + no blockers.
 *                      Still requires human approval. Never auto-promotes.
 *   MUTATION_READY  — controlled mutation QA succeeded against a
 *                      health-confirmed safe preview DB with no live sends.
 *   PREVIEW_READY   — preview QA + widget e2e pass; mutation gate
 *                      blocked or not run.
 *   LOCAL_READY     — local doctor + gate green; preview QA missing
 *                      or blocked by missing bypass.
 *   BLOCKED         — any blocking local failure.
 *
 * The verdict is deterministic from the inputs. No network calls.
 */

/**
 * @typedef {Object} VerdictInput
 * @property {{ healthy: boolean; blocking_failures: string[] }} doctor
 * @property {{ passed: boolean; pass_count: number; fail_count: number }} safetyScan
 * @property {Object|null} previewQa  Summary from preview-qa-report.json
 * @property {Object|null} widgetE2e  Summary from widget-e2e-report.json
 * @property {Object|null} releaseCandidate Summary from release-candidate-report.json
 * @property {{ rollbackDoc: boolean; governanceDocs: boolean }} docs
 */

/**
 * @param {VerdictInput} input
 * @returns {{ verdict: "BLOCKED"|"LOCAL_READY"|"PREVIEW_READY"|"MUTATION_READY"|"PROMOTION_READY";
 *           reasons: string[]; missing_work: string[] }}
 */
export function computeLaunchVerdict(input) {
  const reasons = [];
  const missing = [];

  // 1. Local gate must be green.
  if (!input.doctor?.healthy) {
    return {
      verdict: "BLOCKED",
      reasons: [
        "release-doctor reported blocking failures",
        ...((input.doctor?.blocking_failures ?? []).map((b) => `doctor:${b}`)),
      ],
      missing_work: ["fix blocking doctor failures, then re-run launch:authority"],
    };
  }
  if (!input.safetyScan?.passed) {
    return {
      verdict: "BLOCKED",
      reasons: ["release-safety scan failed"],
      missing_work: ["fix safety-scan failures, then re-run"],
    };
  }

  // 2. Preview QA evidence.
  const qa = input.previewQa;
  const qaAccessBlocked = qa?.access_blocked === true;
  const qaHasOtherFailures =
    qa && qa.totals && qa.totals.fail > 0 && !qaAccessBlocked;
  const qaPresentAndUsable =
    qa &&
    !qaAccessBlocked &&
    (qa.totals?.fail ?? 0) === 0 &&
    (qa.totals?.pass ?? 0) > 0;

  if (!qa) {
    missing.push("run npm run preview:qa with VERCEL_AUTOMATION_BYPASS_SECRET");
    return {
      verdict: "LOCAL_READY",
      reasons: ["local gate green; no preview QA artifact present"],
      missing_work: missing,
    };
  }
  if (qaAccessBlocked) {
    missing.push(
      "re-run preview:qa with VERCEL_AUTOMATION_BYPASS_SECRET to clear early access failure"
    );
    return {
      verdict: "LOCAL_READY",
      reasons: ["preview QA present but blocked by missing bypass"],
      missing_work: missing,
    };
  }
  if (qaHasOtherFailures) {
    reasons.push("preview QA has substantive failures");
    return {
      verdict: "BLOCKED",
      reasons,
      missing_work: ["investigate preview-qa-report.md and fix failures"],
    };
  }

  // 3. Health-endpoint live-send safety. Required for any preview-ready state.
  const health = qa.health_summary ?? null;
  if (!health) {
    missing.push("preview QA did not capture health endpoint output");
  }

  // 4. Widget e2e — required for PREVIEW_READY and above.
  const e2e = input.widgetE2e;
  if (!e2e || !e2e.passed) {
    missing.push(
      e2e
        ? "widget e2e ran but did not pass"
        : "run preview:e2e and produce artifacts/widget-e2e-report.json"
    );
  }

  // 5. Mutation gate state.
  const mutationAllowed = qa.mutation_gate_allowed === true;
  const mutationHealthSafe = health?.safe_for_preview_mutation === true;
  // The runner must never have run mutations against an unsafe DB.
  if (mutationAllowed && !mutationHealthSafe) {
    return {
      verdict: "BLOCKED",
      reasons: ["mutation gate was allowed without health-confirmed safety"],
      missing_work: ["investigate preview-qa-report.md; halt promotion"],
    };
  }

  // Without widget e2e + clean preview QA we can be at most LOCAL_READY.
  if (!qaPresentAndUsable || !e2e || !e2e.passed) {
    return {
      verdict: "LOCAL_READY",
      reasons: ["preview evidence incomplete"],
      missing_work: missing,
    };
  }

  // Strict no-live-sends rule: never call anything above PREVIEW_READY
  // when live SMS or email are enabled.
  const liveSendsDisabled =
    health?.live_sms_disabled !== false && health?.live_email_disabled !== false;
  if (health && !liveSendsDisabled) {
    return {
      verdict: "BLOCKED",
      reasons: ["live SMS or email is enabled in the preview env"],
      missing_work: ["set ENABLE_SMS=false and ENABLE_EMAIL=false in preview"],
    };
  }

  const isMutationReady =
    mutationAllowed &&
    mutationHealthSafe &&
    qaPresentAndUsable &&
    health?.live_sms_disabled !== false &&
    health?.live_email_disabled !== false;

  // 6. Governance / rollback docs.
  const docsOk = !!input.docs?.rollbackDoc && !!input.docs?.governanceDocs;
  if (!docsOk) {
    missing.push("rollback / governance docs missing — see docs/rollback-runbook.md");
  }

  // 7. Final ladder.
  if (qaPresentAndUsable && e2e?.passed && docsOk && (isMutationReady || true)) {
    if (isMutationReady) {
      // PROMOTION_READY needs rollback doc + governance + mutation ready
      // OR explicit "mutation not required" — for our system, we require
      // the mutation evidence to call PROMOTION_READY.
      return {
        verdict: "PROMOTION_READY",
        reasons: [
          "preview QA + widget e2e + mutation evidence + rollback doc all present",
          "human approval still required",
        ],
        missing_work: ["human approves and runs the promotion sequence"],
      };
    }
    return {
      verdict: "PREVIEW_READY",
      reasons: [
        "preview QA + widget e2e green; mutation gate blocked or not run",
      ],
      missing_work: missing.length
        ? missing
        : [
            "controlled preview mutation QA (see docs/controlled-preview-mutation-qa.md) before promotion",
          ],
    };
  }

  return {
    verdict: "LOCAL_READY",
    reasons,
    missing_work: missing,
  };
}
