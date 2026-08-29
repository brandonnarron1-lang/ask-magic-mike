import { describe, expect, it } from "vitest";
import {
  classifyDatabaseEnv,
  computeDatabaseIdentity,
  computeHealthSafety,
} from "@/lib/admin/health-safety";

function previewEnv(over: Record<string, string | undefined> = {}) {
  return {
    VERCEL_ENV: "preview",
    DATABASE_ENV: "preview",
    DATABASE_URL:
      "postgresql://ep-amm-preview-qa123456-pooler.c-2.us-east-1.aws.neon.tech/neondb",
    PREVIEW_NEON_ENDPOINT_ID: "ep-amm-preview-qa123456",
    PRODUCTION_NEON_ENDPOINT_ID: "ep-amm-production-qa654321",
    ADMIN_SECRET: "configured-for-test",
    PREVIEW_DATA_MODE: "enabled",
    ALLOW_PREVIEW_DB_MUTATION: "true",
    ...over,
  } as Record<string, string | undefined>;
}

function safeInput(envOver: Record<string, string | undefined> = {}) {
  return {
    env: previewEnv(envOver),
    dbConfigured: true,
    dbReachable: true,
    migration00012Likely: true,
    smsEnabled: false,
    emailEnabled: false,
  };
}

describe("classifyDatabaseEnv", () => {
  it("prefers an explicit DATABASE_ENV", () => {
    expect(
      classifyDatabaseEnv({ DATABASE_ENV: "preview", VERCEL_ENV: "production" })
    ).toBe("preview");
  });

  it("falls back to VERCEL_ENV for non-mutating classification", () => {
    expect(classifyDatabaseEnv({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(classifyDatabaseEnv({})).toBe("unknown");
  });
});

describe("computeDatabaseIdentity", () => {
  it("confirms preview identity only when both scopes say preview", () => {
    expect(computeDatabaseIdentity(previewEnv())).toMatchObject({
      database_env: "preview",
      database_env_explicit: true,
      vercel_env: "preview",
      endpoint_identity_configured: true,
      endpoint_ids_distinct: true,
      database_neon_endpoint_resolved: true,
      preview_endpoint_match: true,
      production_endpoint_match: false,
      preview_identity_confirmed: true,
    });
  });

  it("does not trust a preview deployment without explicit database identity", () => {
    expect(
      computeDatabaseIdentity(previewEnv({ DATABASE_ENV: undefined }))
        .preview_identity_confirmed
    ).toBe(false);
  });
});

describe("computeHealthSafety", () => {
  it("returns true only when every condition holds", () => {
    const result = computeHealthSafety(safeInput());
    expect(result.safe_for_preview_mutation).toBe(true);
    expect(result.safety_blockers).toEqual([]);
  });

  it("blocks when DATABASE_ENV is absent", () => {
    const result = computeHealthSafety(
      safeInput({ DATABASE_ENV: undefined })
    );
    expect(result.safe_for_preview_mutation).toBe(false);
    expect(result.safety_blockers).toContain("database_env_not_explicit");
  });

  it("blocks a preview deployment labelled as production data", () => {
    const result = computeHealthSafety(
      safeInput({ DATABASE_ENV: "production" })
    );
    expect(result.safe_for_preview_mutation).toBe(false);
    expect(result.safety_blockers).toContain("database_identity_not_preview");
  });

  it("blocks labels that say Preview when DATABASE_URL resolves to Production", () => {
    const result = computeHealthSafety(
      safeInput({
        DATABASE_URL:
          "postgresql://ep-amm-production-qa654321.us-east-2.aws.neon.tech/neondb",
      }),
    );

    expect(result.safe_for_preview_mutation).toBe(false);
    expect(result.safety_blockers).toContain(
      "database_neon_endpoint_not_preview",
    );
    expect(result.safety_blockers).toContain(
      "database_neon_endpoint_matches_production",
    );
    expect(result.identity.preview_endpoint_match).toBe(false);
    expect(result.identity.production_endpoint_match).toBe(true);
  });

  it("blocks missing, unresolved, or non-distinct endpoint identity", () => {
    expect(
      computeHealthSafety(
        safeInput({ PREVIEW_NEON_ENDPOINT_ID: undefined }),
      ).safety_blockers,
    ).toContain("preview_neon_endpoint_id_not_configured");
    expect(
      computeHealthSafety(
        safeInput({ DATABASE_URL: "postgresql://example.invalid/neondb" }),
      ).safety_blockers,
    ).toContain("database_neon_endpoint_unresolved");
    expect(
      computeHealthSafety(
        safeInput({
          PRODUCTION_NEON_ENDPOINT_ID: "ep-amm-preview-qa123456",
        }),
      ).safety_blockers,
    ).toContain("neon_endpoint_ids_not_distinct");
  });

  it("returns categorical identity only, never connection or endpoint values", () => {
    const serialized = JSON.stringify(
      computeDatabaseIdentity(previewEnv()),
    );
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("neon.tech");
    expect(serialized).not.toContain("ep-amm-");
  });

  it("blocks live delivery channels", () => {
    expect(
      computeHealthSafety({ ...safeInput(), smsEnabled: true }).safety_blockers
    ).toContain("live_sms_enabled");
    expect(
      computeHealthSafety({ ...safeInput(), emailEnabled: true }).safety_blockers
    ).toContain("live_email_enabled");
  });

  it("blocks when the canonical migration is unavailable", () => {
    expect(
      computeHealthSafety({
        ...safeInput(),
        migration00012Likely: false,
      }).safety_blockers
    ).toContain("migration_00012_missing");
  });

  it("requires explicit write authorization and preview data mode", () => {
    expect(
      computeHealthSafety(
        safeInput({ ALLOW_PREVIEW_DB_MUTATION: "false" })
      ).safety_blockers
    ).toContain("allow_preview_db_mutation_not_set");
    expect(
      computeHealthSafety(safeInput({ PREVIEW_DATA_MODE: "disabled" }))
        .safety_blockers
    ).toContain("preview_data_disabled");
  });

  it("blocks non-preview runtimes", () => {
    const result = computeHealthSafety(
      safeInput({ VERCEL_ENV: "production" })
    );
    expect(result.safe_for_preview_mutation).toBe(false);
    expect(result.safety_blockers).toContain("not_preview_runtime");
  });
});
