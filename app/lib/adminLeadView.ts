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
  AdminLeadView,
} from "./persistence/supabase/adminLeadView";

export function loadAdminLeadInbox(limit = 50, principal: LeadCenterPrincipal | null = null) {
  return process.env.DATABASE_URL
    ? loadNeonAdminLeadInbox(limit, principal)
    : loadSupabaseAdminLeadInbox(limit);
}

export function loadAdminLeadDetail(leadId: string, principal: LeadCenterPrincipal | null = null) {
  return process.env.DATABASE_URL
    ? loadNeonAdminLeadDetail(leadId, principal)
    : loadSupabaseAdminLeadDetail(leadId);
}
