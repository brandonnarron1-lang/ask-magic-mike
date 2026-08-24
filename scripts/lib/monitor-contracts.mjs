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

export const PRODUCTION_ROUTE_CONTRACTS = Object.freeze([
  { name: "home", path: "/", expected: 200 },
  { name: "seller", path: "/sell", expected: 200 },
  { name: "buyer", path: "/buy", expected: 200 },
  { name: "home-value", path: "/home-value", expected: 200 },
  {
    name: "value-alias",
    path: "/value",
    expected: 308,
    expectedLocation: "/home-value",
  },
  {
    name: "we-buy-houses-alias",
    path: "/we-buy-houses",
    expected: 308,
    expectedLocation: "/sell",
  },
  { name: "ask", path: "/ask", expected: 200 },
  { name: "widget", path: "/widget/v1", expected: 200 },
  { name: "live", path: "/api/health/live", expected: 200 },
  { name: "ready", path: "/api/health/ready", expected: 200 },
  { name: "admin-anonymous-denial", path: "/admin", expected: [401, 307] },
]);

/**
 * Validate both the status code and, for compatibility aliases, the exact
 * same-origin redirect target. The monitor requests aliases without a query;
 * query preservation is covered by the Next.js redirect contract test.
 */
export function evaluateRouteContract(contract, response) {
  const expectedStatuses = Array.isArray(contract.expected)
    ? contract.expected
    : [contract.expected];
  const statusOk = expectedStatuses.includes(response.status);
  const locationOk = contract.expectedLocation === undefined
    || response.location === contract.expectedLocation;

  return {
    ok: statusOk && locationOk,
    statusOk,
    locationOk,
  };
}

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
