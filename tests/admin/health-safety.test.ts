import { describe, expect, it } from "vitest";
import {
  classifyDatabaseEnv,
  computeDatabaseIdentity,
  computeHealthSafety,
  extractSupabaseRef,
} from "@/lib/admin/health-safety";

const PROD_REF = "prod-abc1234";
const PREVIEW_REF = "preview-xyz9876";

function previewEnv(over: Record<string, string | undefined> = {}) {
  return {
    VERCEL_ENV: "preview",
    DATABASE_ENV: "preview",
    PREVIEW_DATA_MODE: "enabled",
    ALLOW_PREVIEW_DB_MUTATION: "true",
    NEXT_PUBLIC_SUPABASE_URL: `https://${PREVIEW_REF}.supabase.co`,
    SUPABASE_PROJECT_REF: PREVIEW_REF,
    PRODUCTION_SUPABASE_PROJECT_REF: PROD_REF,
    PREVIEW_SUPABASE_PROJECT_REF: PREVIEW_REF,
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

describe("extractSupabaseRef", () => {
  it("prefers SUPABASE_PROJECT_REF when set", () => {
    expect(
      extractSupabaseRef({
        SUPABASE_PROJECT_REF: "explicit",
        NEXT_PUBLIC_SUPABASE_URL: "https://derived.supabase.co",
      })
    ).toBe("explicit");
  });

  it("falls back to the host of NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(
      extractSupabaseRef({
        NEXT_PUBLIC_SUPABASE_URL: "https://abcdef.supabase.co",
      })
    ).toBe("abcdef");
  });

  it("returns null when neither is set", () => {
    expect(extractSupabaseRef({})).toBeNull();
  });
});

describe("classifyDatabaseEnv", () => {
  it("uses DATABASE_ENV when set to a known value", () => {
    expect(classifyDatabaseEnv({ DATABASE_ENV: "preview" })).toBe("preview");
    expect(classifyDatabaseEnv({ DATABASE_ENV: "production" })).toBe(
      "production"
    );
  });

  it("falls back to VERCEL_ENV", () => {
    expect(classifyDatabaseEnv({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(classifyDatabaseEnv({ VERCEL_ENV: "production" })).toBe(
      "production"
    );
  });

  it("returns unknown when nothing maps", () => {
    expect(classifyDatabaseEnv({})).toBe("unknown");
  });
});

describe("computeDatabaseIdentity", () => {
  it("marks matches_preview_ref when refs align", () => {
    const id = computeDatabaseIdentity(previewEnv());
    expect(id.matches_preview_ref).toBe(true);
    expect(id.matches_production_ref).toBe(false);
  });

  it("flags matches_production_ref when the supabase URL points at prod", () => {
    const id = computeDatabaseIdentity(
      previewEnv({
        SUPABASE_PROJECT_REF: PROD_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
      })
    );
    expect(id.matches_production_ref).toBe(true);
  });
});

describe("computeHealthSafety", () => {
  it("returns true only when every condition holds", () => {
    const r = computeHealthSafety(safeInput());
    expect(r.safe_for_preview_mutation).toBe(true);
    expect(r.safety_blockers).toEqual([]);
  });

  it("blocks when DB identity is unknown", () => {
    const r = computeHealthSafety(
      safeInput({
        DATABASE_ENV: undefined,
        VERCEL_ENV: undefined,
        SUPABASE_PROJECT_REF: undefined,
        NEXT_PUBLIC_SUPABASE_URL: "",
      })
    );
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("database_env_unknown");
  });

  it("blocks when live SMS is enabled", () => {
    const r = computeHealthSafety({ ...safeInput(), smsEnabled: true });
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("live_sms_enabled");
  });

  it("blocks when live email is enabled", () => {
    const r = computeHealthSafety({ ...safeInput(), emailEnabled: true });
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("live_email_enabled");
  });

  it("blocks when supabase ref matches the production ref", () => {
    const r = computeHealthSafety(
      safeInput({
        SUPABASE_PROJECT_REF: PROD_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
      })
    );
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("matches_production_ref");
  });

  it("blocks when migration 00012 is not applied", () => {
    const r = computeHealthSafety({
      ...safeInput(),
      migration00012Likely: false,
    });
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("migration_00012_missing");
  });

  it("blocks when ALLOW_PREVIEW_DB_MUTATION is not set", () => {
    const r = computeHealthSafety(
      safeInput({ ALLOW_PREVIEW_DB_MUTATION: "false" })
    );
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("allow_preview_db_mutation_not_set");
  });

  it("blocks preview mutation when PREVIEW_DATA_MODE is disabled or absent", () => {
    const disabled = computeHealthSafety(
      safeInput({ PREVIEW_DATA_MODE: "disabled" })
    );
    expect(disabled.safe_for_preview_mutation).toBe(false);
    expect(disabled.safety_blockers).toContain("preview_data_disabled");

    const absent = computeHealthSafety(
      safeInput({ PREVIEW_DATA_MODE: undefined })
    );
    expect(absent.safe_for_preview_mutation).toBe(false);
    expect(absent.safety_blockers).toContain("preview_data_disabled");
  });

  it("allows when DATABASE_ENV=preview and no production ref is configured", () => {
    const r = computeHealthSafety(
      safeInput({
        SUPABASE_PROJECT_REF: "any-ref",
        NEXT_PUBLIC_SUPABASE_URL: "https://any-ref.supabase.co",
        PRODUCTION_SUPABASE_PROJECT_REF: undefined,
        PREVIEW_SUPABASE_PROJECT_REF: undefined,
      })
    );
    expect(r.safe_for_preview_mutation).toBe(true);
  });

  it("blocks when not a preview runtime", () => {
    const r = computeHealthSafety(
      safeInput({ VERCEL_ENV: "production", DATABASE_ENV: undefined })
    );
    expect(r.safe_for_preview_mutation).toBe(false);
    expect(r.safety_blockers).toContain("not_preview_runtime");
  });
});
