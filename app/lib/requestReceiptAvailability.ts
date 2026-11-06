import { configuredEmailProvider, emailProviderConfigurationReady } from "./emailProviderConfiguration";
import { requestResponseDraft } from "./requestResponseTemplates";

/** Configuration-only advisory UI state. No provider call, mailbox, secret,
 * permission grant or delivery guarantee leaves this boundary. The outbox and
 * dispatch checks remain authoritative for each actual inquiry. */
export function requestReceiptAvailable(env: Record<string, string | undefined> = process.env, now = Date.now()): boolean {
  const draft = requestResponseDraft(env);
  const enabled = (value: string | undefined) => value?.toLowerCase() === "true";
  return env.REQUEST_RESPONSE_WORKER_ENABLED === "true" && draft.receipts && !!draft.cutoff &&
    Date.parse(draft.cutoff) <= now && !!draft.reply_to && enabled(env.CUSTOMER_EMAIL_ENABLED) &&
    (env.LEAD_NOTIFICATION_MODE || env.NOTIFICATION_PROVIDER_MODE || "disabled").toLowerCase() === "production" &&
    enabled(env.LEAD_NOTIFICATION_PRODUCTION_ENABLED) &&
    (enabled(env.EMAIL_ENABLED) || enabled(env.AGENT_NOTIFICATIONS_ENABLED)) &&
    configuredEmailProvider(env) === "resend" && emailProviderConfigurationReady(env);
}
