import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin health security boundary", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/api/admin/health/route.ts"), "utf8");

  it("does not accept secrets from URL search parameters", () => {
    expect(source).not.toContain('searchParams.get("admin_secret")');
    expect(source).not.toContain("req.nextUrl.searchParams");
  });

  it("uses the timing-safe shared authentication helpers", () => {
    expect(source).toContain("checkAdminAuth");
    expect(source).toContain("checkBearerSecret");
  });

  it("probes the canonical Neon database instead of Supabase", () => {
    expect(source).toContain("DATABASE_URL");
    expect(source).toContain("neon_postgres");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("reports only rate-limit HMAC secret presence, never its value", () => {
    expect(source).toContain("rate_limit_hash_secret_present: rateLimitHashSecretPresent");
    expect(source).not.toContain("rate_limit_hash_secret: process.env");
  });

  it("reports Neon identity as booleans without returning IDs or URLs", () => {
    expect(source).toContain("endpoint_identity_configured");
    expect(source).toContain("preview_endpoint_match");
    expect(source).toContain("production_endpoint_match");
    expect(source).not.toContain("PREVIEW_NEON_ENDPOINT_ID:");
    expect(source).not.toContain("PRODUCTION_NEON_ENDPOINT_ID:");
    expect(source).not.toContain("database_url: process.env.DATABASE_URL");
  });

  it("exposes protected aggregate notification health without recipients or message bodies", () => {
    expect(source).toContain("operations_query_ready");
    expect(source).toContain("live_queue_depth");
    expect(source).toContain("test_records_excluded");
    expect(source).not.toContain("recipient_reference:");
    expect(source).not.toContain("question_raw:");
  });

  it("exposes aggregate first-response work coverage without lead identity", () => {
    expect(source).toContain("loadNeonAdminActionQueue({ aggregateOnly: true })");
    expect(source).toContain("lead_operations:");
    expect(source).toContain("first_response_risk_count");
    expect(source).toContain("first_response_covered_count");
    expect(source).toContain("first_response_uncovered_count");
    expect(source).toContain("first_response_coverage_complete");
    expect(source).toContain("test_and_suppressed_records_excluded: true");
    expect(source).not.toContain("lead_label:");
    expect(source).not.toContain("lead_id:");
    expect(source).not.toContain("first_name:");
    expect(source).not.toContain("last_name:");
    expect(source).not.toContain("address_raw:");
  });
});
