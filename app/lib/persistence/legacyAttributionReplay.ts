import { cleanOptional, type Attribution, type LeadPayload } from "../leadPayload";
import { inquiryRequestContext } from "../leadAlertLaunch";

/** Transitional reader only. This shape reproduces PR314's fingerprint for an
 * exact frozen request. Never write, render, log, notify or return this object.
 * Historical stored evidence is not rewritten. Remove only after the pending
 * request retention boundary has been reviewed, not as cosmetic cleanup. */
export function legacyAttributionReplayPayload(payload: LeadPayload, input: Record<string, unknown>): LeadPayload {
  const raw = input.attribution && typeof input.attribution === "object" ? input.attribution as Record<string, unknown> : {};
  const fields = ["source", "medium", "campaign", "content", "term", "referrer", "landing_page", "current_path", "parent_url", "embed_host", "placement", "placement_id", "listing_id", "property_id", "agent_id", "page_title", "gclid", "gbraid", "wbraid", "fbclid", "msclkid"];
  const snapshot = (value: unknown) => Object.fromEntries(fields.map(key => [key, cleanOptional(value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined)]).filter(([, value]) => value));
  // question_raw embedded this exact property order before minimization; its
  // legacy MD5 hashes text, not JSONB. A reordered reconstruction is not equal.
  const rootFields = ["source", "medium", "campaign", "content", "term", "referrer", "landing_page", "initial_path", "current_path", "parent_url", "embed_host", "placement", "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "page_title", "placement_id", "listing_id", "property_id", "agent_id"];
  const attribution: Attribution = { ...Object.fromEntries(rootFields.map(key => [key, cleanOptional(raw[key])])),
    placement_id: cleanOptional(raw.placement_id || raw.placement), first_touch: snapshot(raw.first_touch), last_touch: snapshot(raw.last_touch),
    device_category: cleanOptional(raw.device_category), created_at: cleanOptional(raw.created_at) };
  const clickIds = raw.click_ids && typeof raw.click_ids === "object" ? raw.click_ids as Record<string, unknown> : {};
  for (const key of ["gclid", "gbraid", "wbraid", "fbclid", "msclkid"] as const) attribution[key] = cleanOptional(raw[key] || clickIds[key]);
  return { ...payload, attribution, page_url: cleanOptional(input.page_url) };
}
export function legacyAttributionReplayContext(payload: LeadPayload, input: Record<string, unknown>) {
  return inquiryRequestContext(legacyAttributionReplayPayload(payload, input));
}
