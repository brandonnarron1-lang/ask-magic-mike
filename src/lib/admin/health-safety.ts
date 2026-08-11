import { isPreviewDataDisabled, previewDataMode } from "@/lib/preview-security";

/**
 * Provider-neutral mutation-safety policy for `/api/admin/health`.
 *
 * Preview writes are deliberately opt-in. A Vercel preview alone is not
 * enough: the database must also be explicitly labelled `DATABASE_ENV=preview`.
 * This prevents a preview deployment from mutating production when its
 * DATABASE_URL was copied into the wrong environment scope.
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
  database_env_explicit: boolean;
  vercel_env: "preview" | "production" | "development" | "unknown";
  preview_identity_confirmed: boolean;
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

type KnownEnvironment = DatabaseIdentity["database_env"];

function normalizeEnvironment(value: string | undefined): KnownEnvironment {
  const normalized = (value ?? "").toLowerCase();
  if (
    normalized === "preview" ||
    normalized === "production" ||
    normalized === "development"
  ) {
    return normalized;
  }
  return "unknown";
}

export function classifyDatabaseEnv(
  env: Record<string, string | undefined>
): KnownEnvironment {
  const explicit = normalizeEnvironment(env.DATABASE_ENV);
  if (explicit !== "unknown") return explicit;
  return normalizeEnvironment(env.VERCEL_ENV);
}

export function computeDatabaseIdentity(
  env: Record<string, string | undefined>
): DatabaseIdentity {
  const explicitDatabaseEnv = normalizeEnvironment(env.DATABASE_ENV);
  const vercelEnv = normalizeEnvironment(env.VERCEL_ENV);

  return {
    database_env:
      explicitDatabaseEnv !== "unknown" ? explicitDatabaseEnv : vercelEnv,
    database_env_explicit: explicitDatabaseEnv !== "unknown",
    vercel_env: vercelEnv,
    preview_identity_confirmed:
      explicitDatabaseEnv === "preview" && vercelEnv === "preview",
  };
}

export function computeHealthSafety(input: HealthSafetyInput): HealthSafety {
  const identity = computeDatabaseIdentity(input.env);
  const allowPreviewMutation =
    (input.env.ALLOW_PREVIEW_DB_MUTATION ?? "false").toLowerCase() === "true";
  const isPreviewRuntime = identity.vercel_env === "preview";
  const previewDisabled = isPreviewDataDisabled(input.env);

  const blockers: string[] = [];

  if (!isPreviewRuntime) blockers.push("not_preview_runtime");
  if (!identity.database_env_explicit)
    blockers.push("database_env_not_explicit");
  if (!identity.preview_identity_confirmed)
    blockers.push("database_identity_not_preview");
  if (previewDisabled) blockers.push("preview_data_disabled");
  if (!allowPreviewMutation) blockers.push("allow_preview_db_mutation_not_set");
  if (!input.dbConfigured) blockers.push("db_not_configured");
  if (!input.dbReachable) blockers.push("db_unreachable");
  if (!input.migration00012Likely) blockers.push("migration_00012_missing");
  if (input.smsEnabled) blockers.push("live_sms_enabled");
  if (input.emailEnabled) blockers.push("live_email_enabled");

  const warnings: string[] = [];
  if (!input.env.DATABASE_URL) warnings.push("database_url_missing");
  if (!input.env.ADMIN_SECRET) warnings.push("admin_secret_missing");
  if (!identity.database_env_explicit)
    warnings.push("database_env_not_explicit");
  if (isPreviewRuntime && previewDataMode(input.env) !== "enabled")
    warnings.push("preview_data_disabled");
  if (input.smsEnabled) warnings.push("live_sms_enabled");
  if (input.emailEnabled) warnings.push("live_email_enabled");
  if (input.dbConfigured && !input.dbReachable) warnings.push("db_unreachable");
  if (input.dbConfigured && input.dbReachable && !input.migration00012Likely)
    warnings.push("migration_00012_not_applied");

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
