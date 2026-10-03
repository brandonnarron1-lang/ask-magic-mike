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
  normalizeAdminLeadFirstResponseRow,
} from "./persistence/supabase/adminLeadView";
export type {
  AdminAttributionView,
  AdminAiDraftReviewRow,
  AdminLeadDetailResult,
  AdminLeadFirstResponseRow,
  AdminLeadInboxResult,
  AdminLeadInboxQuery,
  AdminLeadOutcomeRow,
  AdminLeadView,
} from "./persistence/supabase/adminLeadView";

export async function loadAdminLeadInbox(
  input: number | import("./persistence/supabase/adminLeadView").AdminLeadInboxQuery = 50,
  principal: LeadCenterPrincipal | null = null,
) {
  if (process.env.DATABASE_URL) return loadNeonAdminLeadInbox(input, principal);
  const legacyAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  if (!legacyAllowed) return loadNeonAdminLeadInbox(input, principal);
  const query = typeof input === "number" ? { limit: input } : input;
  const result = await loadSupabaseAdminLeadInbox(100);
  const { filterAdminLeadInbox } = await import("./adminLeadInboxFilters");
  let leads = filterAdminLeadInbox(result.leads, query.filter || "active");
  const search = query.search?.trim().toLowerCase();
  if (search) {
    leads = leads.filter((lead) => [lead.id, lead.name, lead.email, lead.phone, lead.address]
      .some((value) => value?.toLowerCase().includes(search)));
  }
  if (query.sort === "oldest") leads.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const offset = Math.max(0, query.offset || 0);
  const limit = Math.max(1, Math.min(query.limit || 25, 100));
  const total = leads.length;
  return { ...result, leads: leads.slice(offset, offset + limit), page: { offset, limit, total, hasMore: offset + limit < total } };
}

export function loadAdminLeadDetail(
  leadId: string,
  principal: LeadCenterPrincipal | null = null,
  pagination: { offset?: number; limit?: number } = {},
) {
  if (process.env.DATABASE_URL) return loadNeonAdminLeadDetail(leadId, principal, pagination);
  const legacyAllowed = process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
  return legacyAllowed
    ? loadSupabaseAdminLeadDetail(leadId)
    : loadNeonAdminLeadDetail(leadId, principal, pagination);
}
