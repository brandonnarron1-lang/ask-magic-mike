export {
  bucketAgentAvailability,
  normalizeAgentRow,
  normalizeAssignableLeadRow,
  scoreLeadForAssignment,
  summarizeAgentAllocation,
} from "./persistence/supabase/adminAgentAllocationView";
export type {
  AdminAgentAllocationAgent,
  AdminAgentAllocationSummary,
  AdminAgentAvailability,
  AdminAssignableLead,
} from "./persistence/supabase/adminAgentAllocationView";

import { loadAdminAgentAllocationView as loadLegacyAgentAllocationView } from "./persistence/supabase/adminAgentAllocationView";
import { loadNeonAdminAgentAllocationView } from "./persistence/neonAdminAgentAllocationView";

function legacyFallbackAllowed() {
  return process.env.NODE_ENV === "test" ||
    (process.env.VERCEL_ENV !== "production" && process.env.ALLOW_LEGACY_SUPABASE_FALLBACK === "true");
}

export function loadAdminAgentAllocationView(limit = 200) {
  if (process.env.DATABASE_URL) return loadNeonAdminAgentAllocationView(limit);
  if (legacyFallbackAllowed()) return loadLegacyAgentAllocationView(limit);
  return loadNeonAdminAgentAllocationView(limit);
}
