// Compatibility facade. Runtime selection is server-only and keeps delivery
// records in the same canonical database as the lead lifecycle.
export {
  normalizeAssignmentAgentRow,
  normalizeAssignmentLeadRow,
  normalizeLeadNotificationRow,
  SupabaseLeadNotificationRepository,
} from "./persistence/supabase/leadNotificationRepository";
export { NeonLeadNotificationRepository } from "./persistence/neonLeadNotificationRepository";

import type { LeadNotificationRepository } from "./leadNotificationTypes";
import { NeonLeadNotificationRepository } from "./persistence/neonLeadNotificationRepository";
import {
  loadAgentForNotification as loadLegacyAgentForNotification,
  loadLeadForNotification as loadLegacyLeadForNotification,
  SupabaseLeadNotificationRepository,
} from "./persistence/supabase/leadNotificationRepository";
import {
  loadNeonAgentForNotification,
  loadNeonLeadForNotification,
} from "./persistence/neonLeadNotificationRepository";
import type {
  AssignmentNotificationAgent,
  AssignmentNotificationLead,
} from "./leadNotificationTypes";

function legacyFallbackAllowed(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === "test" ||
    (env.VERCEL_ENV !== "production" && env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
}

export function createLeadNotificationRepository(
  env: Record<string, string | undefined> = process.env,
): LeadNotificationRepository | null {
  const neonRepository = NeonLeadNotificationRepository.fromEnv(env);
  if (neonRepository) return neonRepository;
  return legacyFallbackAllowed(env) ? new SupabaseLeadNotificationRepository() : null;
}

export function loadLeadForNotification(
  leadId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationLead | null> {
  if (env.DATABASE_URL) return loadNeonLeadForNotification(leadId, env);
  return legacyFallbackAllowed(env) ? loadLegacyLeadForNotification(leadId) : Promise.resolve(null);
}

export function loadAgentForNotification(
  agentId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationAgent | null> {
  if (env.DATABASE_URL) return loadNeonAgentForNotification(agentId, env);
  return legacyFallbackAllowed(env) ? loadLegacyAgentForNotification(agentId) : Promise.resolve(null);
}
