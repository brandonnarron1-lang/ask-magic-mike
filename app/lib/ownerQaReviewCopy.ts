// Server-owned, single-operation guard. Never accept authority or recipient
// overrides from FormData. No environment variables, grants or stores are added.
import { createHash } from "node:crypto";
import { LEAD_ALERT_TEMPLATE_VERSION } from "./leadAlertTemplates";
import { configuredEmailProvider, emailProviderConfigurationReady } from "./emailProviderConfiguration";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import { isPreviewRuntime } from "../../src/lib/preview-security";

export type OwnerQaReviewCopyBinding = Readonly<{
  enabled: boolean;
  sourceSha256: string;
  templateVersion: string;
  recipientSenderScopeSha256: string | null;
}>;

// The source digest comes from the original, recorded single-copy approval.
// The current recipient/sender configuration has NOT been verified in runtime.
// This local candidate must remain disabled/unbound through hosted review.
// Installing a verified scope/activation is a separate exact-source decision,
// not permission to send a second copy or change the existing recipient scope.
export const OWNER_QA_REVIEW_COPY_BINDING: OwnerQaReviewCopyBinding = Object.freeze({
  enabled: false,
  sourceSha256: "bdc165436d3c6ff3eb3cb6605df45db3e4e73b44b71ab77d9691c0c826037384",
  templateVersion: "lead_alert_email_v4",
  recipientSenderScopeSha256: null,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const validEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  && !/[\r\n]/.test(value);
export const reviewCopyDigest = (value: string) => createHash("sha256").update(value).digest("hex");

/** No delivery, persistence or raw config output; usable for private review. */
export function reviewCopyScopeDigest(env: NodeJS.ProcessEnv): string | null {
  const primary = env.LEAD_NOTIFICATION_TO?.trim(); // No configuredTo fallback.
  const bcc = (env.LEAD_NOTIFICATION_BCC || "").split(",").map(value => value.trim());
  const sender = env.AGENT_NOTIFICATION_FROM_EMAIL || env.RESEND_FROM || env.FROM_EMAIL;
  if (!primary || !validEmail(primary) || !sender || !validEmail(sender)
    || bcc.length < 1 || bcc.length > 5 || bcc.some(value => !validEmail(value))
    || new Set(bcc.map(value => value.toLowerCase())).size !== bcc.length
    || bcc.some(value => value.toLowerCase() === primary.toLowerCase())
    || configuredEmailProvider(env) !== "resend") return null;
  return reviewCopyDigest(JSON.stringify({
    provider: "resend", primary: primary.toLowerCase(),
    bcc: bcc.map(value => value.toLowerCase()).sort(), sender,
  }));
}

export type ReviewCopyGate = { ok: true; sourceNotificationId: string }
  | { ok: false; error: string };

/** Pure guard; injected bindings are for synthetic unit tests only. The server
 * action always uses the frozen server-owned binding above, never client input. */
export function gateOwnerQaReviewCopy(
  principal: LeadCenterPrincipal | null,
  input: { sourceNotificationId: string; confirmed: boolean },
  env: NodeJS.ProcessEnv = process.env,
  binding: OwnerQaReviewCopyBinding = OWNER_QA_REVIEW_COPY_BINDING,
): ReviewCopyGate {
  if (!principal || principal.role !== "administrator") return { ok: false, error: "review_copy_forbidden" };
  if (!binding.enabled || !binding.recipientSenderScopeSha256
    || !SHA256.test(binding.recipientSenderScopeSha256)) return { ok: false, error: "review_copy_binding_required" };
  if (env.VERCEL_ENV !== "production" || isPreviewRuntime(env)
    || env.NEXT_PUBLIC_SITE_URL !== "https://www.askmagicmike.com" || !env.DATABASE_URL) {
    return { ok: false, error: "review_copy_runtime_not_eligible" };
  }
  const source = input.sourceNotificationId.trim().toLowerCase();
  if (!UUID.test(source) || reviewCopyDigest(source) !== binding.sourceSha256) {
    return { ok: false, error: "review_copy_source_mismatch" };
  }
  if (binding.templateVersion !== "lead_alert_email_v4"
    || LEAD_ALERT_TEMPLATE_VERSION !== binding.templateVersion) return { ok: false, error: "review_copy_version_mismatch" };
  if (!input.confirmed) return { ok: false, error: "review_copy_confirmation_required" };
  if (reviewCopyScopeDigest(env) !== binding.recipientSenderScopeSha256) {
    return { ok: false, error: "review_copy_configuration_mismatch" };
  }
  if (env.LEAD_NOTIFICATION_MODE !== "production" || env.LEAD_NOTIFICATION_PRODUCTION_ENABLED !== "true"
    || (env.EMAIL_ENABLED !== "true" && env.AGENT_NOTIFICATIONS_ENABLED !== "true")
    || !emailProviderConfigurationReady(env)) return { ok: false, error: "review_copy_delivery_not_ready" };
  return { ok: true, sourceNotificationId: source };
}

export function reviewCopyOutcomeCode(result: {
  ok: boolean; notification: { status: string; provider_message_id: string | null } | null;
}) {
  if (result.notification?.status === "sent" && result.notification.provider_message_id) {
    return "review_copy_provider_accepted"; // Never mailbox receipt/readability acceptance.
  }
  if (result.notification && ["pending", "processing", "sent"].includes(result.notification.status)) {
    return "review_copy_outcome_ambiguous";
  }
  return "review_copy_not_sent";
}
