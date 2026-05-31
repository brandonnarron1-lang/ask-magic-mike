import type { LeadRouting } from "@/types/domain.types";

export interface SLABreachResult {
  acceptBreached: boolean;
  contactBreached: boolean;
  minutesSinceAssignment: number;
  shouldEscalate: boolean;
}

export function checkSLABreaches(routing: LeadRouting): SLABreachResult {
  const now = Date.now();
  const assignedMs = routing.assignedAt.getTime();
  const minutesSinceAssignment = (now - assignedMs) / 60000;

  const acceptBreached =
    routing.acceptedAt === null &&
    now > routing.acceptDeadline.getTime();

  const contactBreached =
    routing.contactedAt === null &&
    now > routing.contactDeadline.getTime();

  const shouldEscalate =
    (acceptBreached || contactBreached) &&
    routing.status !== "escalated";

  return {
    acceptBreached,
    contactBreached,
    minutesSinceAssignment,
    shouldEscalate,
  };
}

export function getSLAStatus(
  routing: LeadRouting
): "on-time" | "accept-at-risk" | "contact-at-risk" | "breached" {
  const result = checkSLABreaches(routing);

  if (result.acceptBreached || result.contactBreached) return "breached";

  const now = Date.now();
  const acceptRemaining = routing.acceptDeadline.getTime() - now;
  const contactRemaining = routing.contactDeadline.getTime() - now;

  if (acceptRemaining < 30_000) return "accept-at-risk";
  if (contactRemaining < 60_000) return "contact-at-risk";

  return "on-time";
}
