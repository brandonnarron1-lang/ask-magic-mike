// Compatibility facade. Runtime selection is server-only and keeps delivery
// records in the same canonical database as the lead lifecycle.
export * from "./persistence/supabase/leadNotificationRepository";
export { NeonLeadNotificationRepository } from "./persistence/neonLeadNotificationRepository";

import type { LeadNotificationRepository } from "./leadNotificationTypes";
import { NeonLeadNotificationRepository } from "./persistence/neonLeadNotificationRepository";
import { SupabaseLeadNotificationRepository } from "./persistence/supabase/leadNotificationRepository";

export function createLeadNotificationRepository(
  env: Record<string, string | undefined> = process.env,
): LeadNotificationRepository {
  return NeonLeadNotificationRepository.fromEnv(env) || new SupabaseLeadNotificationRepository();
}
