import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import {
  ADMIN_ACTIVITY_SOURCES,
  loadNeonAdminActivity,
  type AdminActivitySource,
} from "./persistence/neonAdminActivityView";

export {
  ADMIN_ACTIVITY_SOURCES,
  type AdminActivityEvent,
  type AdminActivityResult,
  type AdminActivitySource,
} from "./persistence/neonAdminActivityView";

export function parseAdminActivitySource(value: unknown): AdminActivitySource | null {
  return typeof value === "string" && (ADMIN_ACTIVITY_SOURCES as readonly string[]).includes(value)
    ? value as AdminActivitySource
    : null;
}

export function loadAdminActivity(input: {
  principal: LeadCenterPrincipal | null;
  offset?: number;
  limit?: number;
  source?: AdminActivitySource | null;
}) {
  return loadNeonAdminActivity(input);
}
