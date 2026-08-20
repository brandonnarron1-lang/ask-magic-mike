import {
  loadAdminLeadDetail as loadSupabaseAdminLeadDetail,
  loadAdminLeadInbox as loadSupabaseAdminLeadInbox,
} from "./persistence/supabase/adminLeadView";
import {
  loadNeonAdminLeadDetail,
  loadNeonAdminLeadInbox,
} from "./persistence/neonAdminLeadView";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

export {
  normalizeAdminLeadRow,
  normalizeAdminLeadRows,
} from "./persistence/supabase/adminLeadView";
export type {
  AdminAttributionView,
  AdminLeadDetailResult,
  AdminLeadInboxResult,
  AdminLeadOutcomeRow,
  AdminLeadView,
} from "./persistence/supabase/adminLeadView";

export function loadAdminLeadInbox(limit = 50, principal: LeadCenterPrincipal | null = null) {
  if (process.env.DATABASE_URL) return loadNeonAdminLeadInbox(limit, principal);
  const legacyAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  return legacyAllowed ? loadSupabaseAdminLeadInbox(limit) : loadNeonAdminLeadInbox(limit, principal);
}

export function loadAdminLeadDetail(leadId: string, principal: LeadCenterPrincipal | null = null) {
  if (process.env.DATABASE_URL) return loadNeonAdminLeadDetail(leadId, principal);
  const legacyAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  return legacyAllowed
    ? loadSupabaseAdminLeadDetail(leadId)
    : loadNeonAdminLeadDetail(leadId, principal);
}
