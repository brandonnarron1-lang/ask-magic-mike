import { describe, expect, it } from "vitest";
import {
  evaluateRateLimitStoreCapability,
  RATE_LIMIT_STORE_CAPABILITY_SELECT,
} from "@/lib/security/rate-limit-readiness";

describe("durable rate-limit store capability", () => {
  it("requires table, schema, privileges, and effective RLS access", () => {
    expect(evaluateRateLimitStoreCapability({
      rate_limit_table: true,
      rate_limit_schema_ready: true,
      rate_limit_permissions_ready: true,
      rate_limit_rls_ready: true,
    })).toEqual({
      table: true,
      schema: true,
      permissions: true,
      rls: true,
      ready: true,
    });

    for (const field of [
      "rate_limit_table",
      "rate_limit_schema_ready",
      "rate_limit_permissions_ready",
      "rate_limit_rls_ready",
    ]) {
      const row: Record<string, unknown> = {
        rate_limit_table: true,
        rate_limit_schema_ready: true,
        rate_limit_permissions_ready: true,
        rate_limit_rls_ready: true,
        [field]: false,
      };
      expect(evaluateRateLimitStoreCapability(row).ready).toBe(false);
    }
  });

  it("fails closed for absent, null, or non-boolean catalog fields", () => {
    expect(evaluateRateLimitStoreCapability(undefined).ready).toBe(false);
    expect(evaluateRateLimitStoreCapability(null).ready).toBe(false);
    expect(evaluateRateLimitStoreCapability({
      rate_limit_table: 1,
      rate_limit_schema_ready: "true",
      rate_limit_permissions_ready: null,
      rate_limit_rls_ready: undefined,
    }).ready).toBe(false);
  });

  it("uses read-only catalog checks and validates the ON CONFLICT target", () => {
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("information_schema.columns");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("has_table_privilege");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("pg_index");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("indisunique");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("indpred IS NULL");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("indkey[0]");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("has_schema_privilege");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("relforcerowsecurity");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).toContain("rolbypassrls");
    expect(RATE_LIMIT_STORE_CAPABILITY_SELECT).not.toMatch(
      /\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM)\b/i,
    );
  });
});
