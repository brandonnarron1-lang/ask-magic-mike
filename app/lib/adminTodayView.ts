import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import {
  loadNeonAdminTodayQueue,
  mutateNeonTodayActionReview,
} from "./persistence/neonAdminTodayView";

export type {
  AdminTodayAction,
  AdminTodayQueueResult,
  TodayActionKind,
  TodayBlocker,
  TodayPriorityBucket,
  TodayReasonCode,
} from "./adminTodayQueue";
export type { TodayReviewMutationResult } from "./persistence/neonAdminTodayView";

export function loadAdminTodayQueue(principal: LeadCenterPrincipal | null, now = new Date()) {
  return loadNeonAdminTodayQueue(principal, now);
}

export function mutateTodayActionReview(input: Parameters<typeof mutateNeonTodayActionReview>[0]) {
  return mutateNeonTodayActionReview(input);
}
