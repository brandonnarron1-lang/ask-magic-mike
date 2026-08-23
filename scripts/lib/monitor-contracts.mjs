const REQUIRED_READINESS_FLAGS = [
  "ok",
  "capture_function",
  "leads_table",
  "notification_table",
  "rate_limit_required",
  "rate_limit_table",
  "rate_limit_schema_ready",
  "rate_limit_permissions_ready",
  "rate_limit_rls_ready",
  "rate_limit_store_ready",
  "rate_limit_secret_ready",
  "rate_limit_ready",
  "push_ready",
];

/**
 * Validate the public readiness response without exposing configuration values.
 * Every required dependency must report the literal boolean true.
 */
export function evaluateReadinessContract(body) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const checks = Object.fromEntries(
    REQUIRED_READINESS_FLAGS.map((field) => [field, record[field] === true]),
  );

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  };
}
