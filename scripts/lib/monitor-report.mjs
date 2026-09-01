const MAX_ATTEMPTS = 3;

function cleanScalar(value, fallback = "unknown") {
  const cleaned = String(value ?? fallback)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (cleaned || fallback).slice(0, 500);
}

function expectedFor(result) {
  const statuses = Array.isArray(result.expected) ? result.expected : [result.expected];
  const statusText = `HTTP ${statuses.join(" or ")}`;
  if (result.expected_location) {
    return `${statusText} redirect to ${cleanScalar(result.expected_location)}`;
  }
  if (result.name === "ready") {
    return `${statusText} with every required readiness flag true`;
  }
  return statusText;
}

function actualFor(result) {
  if (result.error) return cleanScalar(result.error);
  const parts = [`HTTP ${result.actual ?? "no response"}`];
  if (result.expected_location && result.actual_location !== result.expected_location) {
    parts.push(`location ${cleanScalar(result.actual_location, "missing")}`);
  }
  const failedChecks = Object.entries(result.contract_checks ?? {})
    .filter(([, value]) => value !== true)
    .map(([field]) => field);
  if (failedChecks.length) parts.push(`false readiness flags: ${failedChecks.join(", ")}`);
  return parts.join("; ");
}

function classifyFailure(result) {
  if (result.error) {
    return {
      category: "NETWORK_OR_TIMEOUT",
      remediation: "Retry the read-only probe; if it persists, inspect DNS, TLS, Vercel status, and deployment logs.",
      impact: `The ${result.name} production contract could not be observed.`,
    };
  }

  if (result.name === "ready") {
    const failedChecks = Object.entries(result.contract_checks ?? {})
      .filter(([, value]) => value !== true)
      .map(([field]) => field);
    const hasRateLimitFailure = failedChecks.some((field) => field.startsWith("rate_limit_"));
    const hasPushFailure = failedChecks.includes("push_ready");
    const hasDatabaseFailure = failedChecks.some((field) =>
      ["capture_function", "leads_table", "notification_table"].includes(field),
    );

    if (hasDatabaseFailure) {
      return {
        category: "DATABASE_OR_RUNTIME_READINESS",
        remediation: "Verify the Vercel Production DATABASE_URL targets the canonical Neon Production branch and service role, then inspect migrations and runtime logs without rotating healthy credentials.",
        impact: "Lead capture or durable storage may be unavailable even if public pages still render.",
      };
    }
    if (hasRateLimitFailure) {
      return {
        category: "RATE_LIMIT_READINESS",
        remediation: "Inspect the durable rate-limit table, permissions, RLS policy, and hash-secret readiness before accepting traffic.",
        impact: "Public intake protection is not fully ready; lead submission safety may be degraded.",
      };
    }
    if (hasPushFailure) {
      return {
        category: "NOTIFICATION_READINESS",
        remediation: "Inspect push-provider configuration and subscription readiness while preserving stored leads and the email outbox.",
        impact: "Lead storage may work, but an operator notification channel is not ready.",
      };
    }
    return {
      category: "APPLICATION_READINESS",
      remediation: "Inspect the readiness payload and production runtime logs, then repair the failing dependency before declaring production healthy.",
      impact: "The application is live but not ready for a fully reliable lead flow.",
    };
  }

  if (result.name === "admin-anonymous-denial") {
    return {
      category: "AUTHORIZATION_BOUNDARY",
      remediation: "Inspect server-side Lead Center authentication and middleware before any further promotion.",
      impact: "The private Lead Center authorization boundary may be misconfigured.",
    };
  }

  if (result.expected_location) {
    return {
      category: "ROUTING_CONTRACT",
      remediation: "Inspect canonical redirects and deployment routing; preserve the established indexed destination.",
      impact: `The ${result.name} compatibility route is not reaching its canonical funnel destination.`,
    };
  }

  return {
    category: "PUBLIC_ROUTE_AVAILABILITY",
    remediation: "Inspect the affected route and production deployment logs; roll back to the last verified deployment if the failure is release-related.",
    impact: `The ${result.name} public conversion surface is unavailable or returning an unexpected response.`,
  };
}

function unique(values) {
  return [...new Set(values)];
}

export function boundedAttemptCount(value) {
  const parsed = Number.parseInt(String(value ?? MAX_ATTEMPTS), 10);
  if (!Number.isFinite(parsed)) return MAX_ATTEMPTS;
  return Math.min(MAX_ATTEMPTS, Math.max(1, parsed));
}

export function summarizeFailures(results) {
  const failures = results.filter((result) => !result.ok);
  if (!failures.length) {
    return {
      ROOT_CAUSE_CATEGORY: "NONE",
      FAILED_COMPONENT: "NONE",
      EXPECTED: "All production contracts pass",
      ACTUAL: "All production contracts passed",
      REMEDIATION: "No remediation required",
      RETRY_SAFE: true,
      PRODUCTION_IMPACT: "No production impact detected by this synthetic verification",
    };
  }

  const classified = failures.map((failure) => ({
    failure,
    classification: classifyFailure(failure),
  }));
  return {
    ROOT_CAUSE_CATEGORY: unique(classified.map(({ classification }) => classification.category)).join(", "),
    FAILED_COMPONENT: failures.map(({ name }) => cleanScalar(name)).join(", "),
    EXPECTED: failures.map((failure) => `${cleanScalar(failure.name)}: ${expectedFor(failure)}`).join(" | "),
    ACTUAL: failures.map((failure) => `${cleanScalar(failure.name)}: ${actualFor(failure)}`).join(" | "),
    REMEDIATION: unique(classified.map(({ classification }) => classification.remediation)).join(" "),
    RETRY_SAFE: true,
    PRODUCTION_IMPACT: unique(classified.map(({ classification }) => classification.impact)).join(" "),
  };
}

export function buildMonitorReport({ attempts, target, trigger, maxAttempts }) {
  const finalAttempt = attempts.at(-1);
  const firstFailedAttempt = attempts.find((attempt) => attempt.failed > 0);
  const recovered = Boolean(firstFailedAttempt && finalAttempt.failed === 0);
  let summary = summarizeFailures(finalAttempt.results);

  if (recovered) {
    const prior = summarizeFailures(firstFailedAttempt.results);
    summary = {
      ...prior,
      ROOT_CAUSE_CATEGORY: `TRANSIENT_RECOVERED: ${prior.ROOT_CAUSE_CATEGORY}`,
      ACTUAL: `Recovered on bounded attempt ${finalAttempt.attempt}; prior observation: ${prior.ACTUAL}`,
      REMEDIATION: "No immediate production mutation required. Preserve this report and investigate recurrence trends.",
      PRODUCTION_IMPACT: "No current outage detected; a transient production degradation was observed and recovered within the bounded retry window.",
    };
  }

  return {
    schema_version: "amm.production-monitor.v2",
    checked_at: finalAttempt.checked_at,
    target: cleanScalar(target),
    trigger: cleanScalar(trigger, "point_in_time"),
    status: finalAttempt.failed > 0 ? "failed" : recovered ? "recovered_after_retry" : "passed",
    max_attempts: maxAttempts,
    attempt_count: attempts.length,
    passed: finalAttempt.passed,
    failed: finalAttempt.failed,
    summary,
    results: finalAttempt.results,
    attempts,
  };
}

export function formatMonitorMarkdown(report) {
  const rows = Object.entries(report.summary)
    .map(([key, value]) => `| \`${key}\` | ${cleanScalar(value).replaceAll("|", "\\|")} |`)
    .join("\n");
  const resultRows = report.results
    .map((result) => `| ${cleanScalar(result.name)} | ${result.ok ? "PASS" : "FAIL"} | ${cleanScalar(result.actual, "no response")} | ${result.duration_ms} ms |`)
    .join("\n");

  return `# Ask Magic Mike production verification\n\n` +
    `- Status: **${report.status}**\n` +
    `- Checked: ${report.checked_at}\n` +
    `- Trigger: ${report.trigger}\n` +
    `- Attempts: ${report.attempt_count}/${report.max_attempts}\n` +
    `- Contracts: ${report.passed} passed, ${report.failed} failed\n\n` +
    `## Incident summary\n\n| Field | Value |\n| --- | --- |\n${rows}\n\n` +
    `## Final contract results\n\n| Component | Result | HTTP | Duration |\n| --- | --- | ---: | ---: |\n${resultRows}\n`;
}
