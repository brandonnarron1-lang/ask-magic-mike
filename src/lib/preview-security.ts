export type PreviewDataMode = "disabled" | "enabled" | "unknown";

export type PreviewMutationCheck =
  | { ok: true }
  | {
      ok: false;
      statusCode: 503;
      error: "preview_data_disabled";
      publicMessage: string;
    };

export const PREVIEW_READ_ONLY_MESSAGE =
  "This preview is in read-only demonstration mode. No lead or appointment data was saved.";

function normalized(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isPreviewRuntime(env: Record<string, string | undefined> = process.env) {
  return normalized(env.VERCEL_ENV) === "preview" || normalized(env.DATABASE_ENV) === "preview";
}

export function previewDataMode(env: Record<string, string | undefined> = process.env): PreviewDataMode {
  const mode = normalized(env.PREVIEW_DATA_MODE);
  if (mode === "disabled" || mode === "enabled") return mode;
  return "unknown";
}

export function isPreviewDataDisabled(env: Record<string, string | undefined> = process.env) {
  if (!isPreviewRuntime(env)) return false;
  return previewDataMode(env) !== "enabled" || normalized(env.ALLOW_PREVIEW_DB_MUTATION) !== "true";
}

export function serviceRoleAvailable(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function assertDatabaseMutationAllowed(
  env: Record<string, string | undefined> = process.env,
): PreviewMutationCheck {
  if (!isPreviewDataDisabled(env)) return { ok: true };
  return {
    ok: false,
    statusCode: 503,
    error: "preview_data_disabled",
    publicMessage: PREVIEW_READ_ONLY_MESSAGE,
  };
}

export function assertProviderDeliveryAllowed(
  env: Record<string, string | undefined> = process.env,
): PreviewMutationCheck {
  return assertDatabaseMutationAllowed(env);
}
