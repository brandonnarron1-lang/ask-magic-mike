import type { PersistenceFetch } from "./contracts";
import { SupabasePostgrestAdapter } from "./supabasePostgrestAdapter";

export function createDefaultPersistence(
  env: Record<string, string | undefined> = process.env,
  request?: PersistenceFetch,
) {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) return null;
  return new SupabasePostgrestAdapter({
    baseUrl,
    serviceRoleKey,
    fetch: request,
  });
}

export function configuredNotificationMode(
  env: Record<string, string | undefined> = process.env,
): "disabled" | "console" | "sandbox" | "production" {
  if ((env.AGENT_NOTIFICATIONS_ENABLED || "false").toLowerCase() !== "true") {
    return "disabled";
  }
  const mode = (
    env.LEAD_NOTIFICATION_MODE ||
    env.NOTIFICATION_PROVIDER_MODE ||
    "disabled"
  ).toLowerCase();
  return mode === "console" || mode === "sandbox" || mode === "production"
    ? mode
    : "disabled";
}
