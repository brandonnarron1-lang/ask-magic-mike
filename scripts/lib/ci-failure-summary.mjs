export const REQUIRED_CI_FAILURE_FIELDS = Object.freeze([
  "ROOT_CAUSE_CATEGORY",
  "FAILED_COMPONENT",
  "EXPECTED",
  "ACTUAL",
  "REMEDIATION",
  "RETRY_SAFE",
  "PRODUCTION_IMPACT",
]);

function oneLine(value) {
  return String(value ?? "unknown")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1_000);
}
export function buildCiFailureSummary(values) {
  const rows = REQUIRED_CI_FAILURE_FIELDS
    .map((field) => `| \`${field}\` | ${oneLine(values[field]).replaceAll("|", "\\|")} |`)
    .join("\n");
  return `## Required CI failure summary\n\n| Field | Value |\n| --- | --- |\n${rows}\n`;
}
