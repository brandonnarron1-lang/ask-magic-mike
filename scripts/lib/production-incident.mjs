export const PRODUCTION_INCIDENT_TITLE = "[CI Incident] Ask Magic Mike production verification";

function oneLine(value, fallback = "unknown") {
  return String(value ?? fallback).replace(/[\r\n\t]+/g, " ").trim().slice(0, 1_000);
}

export function buildIncidentMarkdown(report, context = {}) {
  const fields = [
    "ROOT_CAUSE_CATEGORY",
    "FAILED_COMPONENT",
    "EXPECTED",
    "ACTUAL",
    "REMEDIATION",
    "RETRY_SAFE",
    "PRODUCTION_IMPACT",
  ];
  const rows = fields
    .map((field) => `| \`${field}\` | ${oneLine(report.summary?.[field]).replaceAll("|", "\\|")} |`)
    .join("\n");
  const runUrl = oneLine(context.runUrl, "unavailable");

  return `## Production verification ${report.status}\n\n` +
    `- Checked: ${oneLine(report.checked_at)}\n` +
    `- Trigger: ${oneLine(report.trigger)}\n` +
    `- Attempts: ${oneLine(report.attempt_count)}/${oneLine(report.max_attempts)}\n` +
    `- Contracts: ${oneLine(report.passed)} passed, ${oneLine(report.failed)} failed\n` +
    `- Workflow run: ${runUrl}\n\n` +
    `| Field | Value |\n| --- | --- |\n${rows}\n\n` +
    `This issue contains synthetic, aggregate-only health evidence. It contains no lead data or secrets.`;
}

export function findOpenIncident(issues) {
  return issues.find((issue) =>
    !issue.pull_request
      && issue.state === "open"
      && issue.title === PRODUCTION_INCIDENT_TITLE,
  );
}
