export function previewRbacBootstrapAvailable(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.VERCEL_ENV === "preview" &&
    env.DATABASE_ENV === "preview" &&
    env.PREVIEW_DATA_MODE === "enabled" &&
    env.ALLOW_PREVIEW_DB_MUTATION === "true" &&
    env.LEAD_CENTER_RBAC_ENABLED === "true" &&
    Boolean(env.DATABASE_URL) &&
    Boolean(env.RBAC_PREVIEW_BOOTSTRAP_TOKEN)
  );
}
