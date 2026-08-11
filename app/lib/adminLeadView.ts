import {
  loadAdminLeadDetail as loadSupabaseAdminLeadDetail,
  loadAdminLeadInbox as loadSupabaseAdminLeadInbox,
} from "./persistence/supabase/adminLeadView";
import {
  loadNeonAdminLeadDetail,
  loadNeonAdminLeadInbox,
} from "./persistence/neonAdminLeadView";

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

export function loadAdminLeadInbox(limit = 50) {
  return process.env.DATABASE_URL
    ? loadNeonAdminLeadInbox(limit)
    : loadSupabaseAdminLeadInbox(limit);
}

export function loadAdminLeadDetail(leadId: string) {
  return process.env.DATABASE_URL
    ? loadNeonAdminLeadDetail(leadId)
    : loadSupabaseAdminLeadDetail(leadId);
}
