export {
  buildAssignmentAuditPayload,
  normalizeAssignmentAuditRow,
} from "./persistence/supabase/adminAssignmentAudit";
export type {
  AdminAssignmentAuditAction,
  AdminAssignmentAuditEvent,
  AdminAssignmentAuditRecord,
  AdminAssignmentAuditResult,
} from "./persistence/supabase/adminAssignmentAudit";

import {
  loadRecentAssignmentAuditEvents as loadLegacyAssignmentAuditEvents,
  writeAssignmentAuditEvent as writeLegacyAssignmentAuditEvent,
  type AdminAssignmentAuditEvent,
} from "./persistence/supabase/adminAssignmentAudit";
import {
  loadRecentNeonAssignmentAuditEvents,
  writeNeonAssignmentAuditEvent,
} from "./persistence/neonAssignmentAudit";

function legacyFallbackAllowed() {
  return process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
}

export function writeAssignmentAuditEvent(event: AdminAssignmentAuditEvent) {
  if (process.env.DATABASE_URL) return writeNeonAssignmentAuditEvent(event);
  if (legacyFallbackAllowed()) return writeLegacyAssignmentAuditEvent(event);
  return writeNeonAssignmentAuditEvent(event);
}

export function loadRecentAssignmentAuditEvents(limit = 25) {
  if (process.env.DATABASE_URL) return loadRecentNeonAssignmentAuditEvents(limit);
  if (legacyFallbackAllowed()) return loadLegacyAssignmentAuditEvents(limit);
  return loadRecentNeonAssignmentAuditEvents(limit);
}
