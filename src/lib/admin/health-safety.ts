/**
 * Pure helpers for `/api/admin/health` mutation-safety classification.
 *
 * The health route uses these helpers so the safety policy is one set
 * of rules, testable in isolation, and shared with the preview QA
 * runner (via `shouldRunMutationChecks` in `scripts/preview-qa-lib.mjs`).
 *
 * Rules — `safe_for_preview_mutation` is true ONLY when EVERY one of
 * the following holds:
 *
 *   1. The runtime is a preview surface:
 *      VERCEL_ENV === "preview" OR DATABASE_ENV === "preview"
 *   2. ALLOW_PREVIEW_DB_MUTATION === "true"
 *   3. Supabase is configured (url + service role key present)
 *   4. Supabase is reachable (probe result passed in)
 *   5. migration_00012_likely_applied === true (probe result passed in)
 *   6. Live SMS disabled
 *   7. Live email disabled
 *   8. SUPABASE_PROJECT_REF (or URL-derived ref) does NOT match
 *      PRODUCTION_SUPABASE_PROJECT_REF
 *   9. Either:
 *      - SUPABASE_PROJECT_REF matches PREVIEW_SUPABASE_PROJECT_REF, OR
 *      - DATABASE_ENV === "preview" AND PRODUCTION_SUPABASE_PROJECT_REF
 *        is absent
 *  10. No critical warnings
 *
 * If identity cannot be determined, the answer is "no".
 */

export interface HealthSafetyInput {
  env: Record<string, string | undefined>;
  dbConfigured: boolean;
  dbReachable: boolean;
  migration00012Likely: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export interface DatabaseIdentity {
  database_env: "preview" | "production" | "development" | "unknown";
  supabase_project_ref: string | null;
  supabase_project_ref_present: boolean;
  matches_production_ref: boolean;
  matches_preview_ref: boolean;
  production_ref_present: boolean;
  preview_ref_present: boolean;
}

export interface HealthSafety {
  identity: DatabaseIdentity;
  live_sms_disabled: boolean;
  live_email_disabled: boolean;
  allow_preview_db_mutation: boolean;
  is_preview_runtime: boolean;
  safe_for_preview_mutation: boolean;
  safety_blockers: string[];
  warnings: string[];
}

/**
 * Extract the supabase project ref from either SUPABASE_PROJECT_REF
 * (preferred) or the host segment of NEXT_PUBLIC_SUPABASE_URL.
 *
 * Returns null when neither is set or the URL is malformed.
 */
export function extractSupabaseRef(
  env: Record<string, string | undefined>
): string | null {
  const direct = env.SUPABASE_PROJECT_REF;
  if (direct && direct.length > 0) return direct;
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) return null;
  try {
    const host = new URL(url).host;
    const ref = host.split(".")[0];
    return ref && ref !== "" ? ref : null;
  } catch {
    return null;
  }
}

export function classifyDatabaseEnv(
  env: Record<string, string | undefined>
): DatabaseIdentity["database_env"] {
  const explicit = (env.DATABASE_ENV ?? "").toLowerCase();
  if (
    explicit === "preview" ||
    explicit === "production" ||
    explicit === "development"
  ) {
    return explicit;
  }
  const vercelEnv = (env.VERCEL_ENV ?? "").toLowerCase();
  if (vercelEnv === "preview" || vercelEnv === "production")
    return vercelEnv === "preview" ? "preview" : "production";
  if (vercelEnv === "development") return "development";
  return "unknown";
}

export function computeDatabaseIdentity(
  env: Record<string, string | undefined>
): DatabaseIdentity {
  const databaseEnv = classifyDatabaseEnv(env);
  const ref = extractSupabaseRef(env);
  const prodRef = env.PRODUCTION_SUPABASE_PROJECT_REF ?? "";
  const previewRef = env.PREVIEW_SUPABASE_PROJECT_REF ?? "";
  return {
    database_env: databaseEnv,
    supabase_project_ref: ref,
    supabase_project_ref_present: !!ref,
    matches_production_ref: !!ref && !!prodRef && ref === prodRef,
    matches_preview_ref: !!ref && !!previewRef && ref === previewRef,
    production_ref_present: !!prodRef,
    preview_ref_present: !!previewRef,
  };
}

/**
 * Compute the full safety verdict. Returns the identity, the verdict,
 * and the ordered list of blockers when the verdict is `false` —
 * useful for the report.
 *
 * The blockers list is deterministic and stable so the safety scanner
 * and report consumers can rely on it.
 */
export function computeHealthSafety(input: HealthSafetyInput): HealthSafety {
  const identity = computeDatabaseIdentity(input.env);
  const allowPreviewMutation =
    (input.env.ALLOW_PREVIEW_DB_MUTATION ?? "false").toLowerCase() === "true";
  const isPreviewRuntime =
    (input.env.VERCEL_ENV ?? "").toLowerCase() === "preview" ||
    identity.database_env === "preview";

  const blockers: string[] = [];

  if (!isPreviewRuntime) blockers.push("not_preview_runtime");
  if (!allowPreviewMutation) blockers.push("allow_preview_db_mutation_not_set");
  if (!input.dbConfigured) blockers.push("db_not_configured");
  if (!input.dbReachable) blockers.push("db_unreachable");
  if (!input.migration00012Likely) blockers.push("migration_00012_missing");
  if (input.smsEnabled) blockers.push("live_sms_enabled");
  if (input.emailEnabled) blockers.push("live_email_enabled");
  if (identity.matches_production_ref) blockers.push("matches_production_ref");

  // Identity must resolve to a preview ref OR an explicit preview
  // DATABASE_ENV with no production ref configured to compare against.
  const identityIndicatesPreview =
    identity.matches_preview_ref ||
    (identity.database_env === "preview" && !identity.production_ref_present);
  if (!identityIndicatesPreview) blockers.push("identity_not_preview");

  if (identity.database_env === "unknown") blockers.push("database_env_unknown");

  // Warnings echo what the health route surfaces today.
  const warnings: string[] = [];
  if (!input.env.NEXT_PUBLIC_SUPABASE_URL) warnings.push("supabase_url_missing");
  if (!input.env.SUPABASE_SERVICE_ROLE_KEY)
    warnings.push("supabase_service_role_missing");
  if (!input.env.ADMIN_SECRET) warnings.push("admin_secret_missing");
  if (input.smsEnabled) warnings.push("live_sms_enabled");
  if (input.emailEnabled) warnings.push("live_email_enabled");
  if (input.dbConfigured && !input.dbReachable) warnings.push("db_unreachable");
  if (input.dbConfigured && input.dbReachable && !input.migration00012Likely)
    warnings.push("migration_00012_not_applied");
  if (identity.matches_production_ref)
    warnings.push("supabase_ref_matches_production");
  if (identity.database_env === "unknown")
    warnings.push("database_env_unknown");

  return {
    identity,
    live_sms_disabled: !input.smsEnabled,
    live_email_disabled: !input.emailEnabled,
    allow_preview_db_mutation: allowPreviewMutation,
    is_preview_runtime: isPreviewRuntime,
    safe_for_preview_mutation: blockers.length === 0,
    safety_blockers: blockers,
    warnings,
  };
}
