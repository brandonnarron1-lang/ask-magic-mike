export {
  agentNameFor,
  bucketLeadStatus,
  isAppointment,
  isClosedLost,
  isContactable,
  isConverted,
  isQualified,
  isSpamOrTest,
  loadAgentNameMap,
  normalizeReportingLeadRow,
  summarizeReportingRows,
  timelineLabel,
} from "./persistence/supabase/adminReportingView";
export type {
  AdminAgentPerformanceGroup,
  AdminReportingGroup,
  AdminReportingLeadRow,
  AdminReportingSummary,
  StatusBucketKey,
} from "./persistence/supabase/adminReportingView";

import { loadAdminReportingSummary as loadLegacyReportingSummary } from "./persistence/supabase/adminReportingView";
import { loadNeonAdminReportingSummary } from "./persistence/neonAdminReportingView";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

function legacyFallbackAllowed() {
  return process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
}

export function loadAdminReportingSummary(
  windowDays: 7 | 30 | 90 = 30,
  principal: LeadCenterPrincipal | null = null,
) {
  if (process.env.DATABASE_URL) return loadNeonAdminReportingSummary(windowDays, principal);
  if (legacyFallbackAllowed()) return loadLegacyReportingSummary(windowDays);
  return loadNeonAdminReportingSummary(windowDays, principal);
}
