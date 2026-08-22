/**
 * Analytics privacy boundary.
 *
 * Analytics is a metrics ledger, not a second lead store. Public callers are
 * untrusted, so only named, scalar dimensions are accepted. The repository
 * applies the broader allowlist again before every durable write.
 */

const MAX_PROPERTIES = 40;
const MAX_DIMENSION_LENGTH = 120;
const MAX_PATH_LENGTH = 180;
const MAX_SAFE_NUMBER = 1_000_000_000;

const EMAIL_PATTERN = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/i;
const PHONE_PATTERN = /(?:^|\D)(?:\+?1[\s.()-]*)?(?:\d[\s.()-]*){10}(?:\D|$)/;
const SECRET_PATTERN = /\b(?:api[_-]?key|authorization|bearer|password|private[_-]?key|secret|token)\b\s*[:=]/i;
const SENSITIVE_QUERY_PATTERN = /[?&](?:address|email|first_?name|last_?name|message|name|phone|question|token)=/i;
const DIMENSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/ -]*$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const SAFE_PUBLIC_PATHS = new Set([
  "/",
  "/accessibility",
  "/ask",
  "/buy",
  "/campaigns",
  "/contact",
  "/distribution",
  "/embed/ask",
  "/home-value",
  "/integrations/ourtownproperties",
  "/plan",
  "/privacy",
  "/rent",
  "/sell",
  "/social-preview",
  "/terms",
  "/thank-you",
  "/value",
  "/we-buy-houses",
  "/widget",
  "/widget-preview",
  "/widget/v1",
]);

const PUBLIC_ATTRIBUTION_KEYS = [
  "current_path",
  "device_category",
  "placement",
  "placement_id",
  "utm_campaign",
  "utm_medium",
  "utm_source",
] as const;

const PUBLIC_EVENT_PROPERTY_KEYS: Record<string, readonly string[]> = {
  session_created: ["deviceType", "referrerType"],
  page_view: ["context", "funnel_name", "page", "path", "route", "step_name", "surface"],
  landing_page_viewed: ["path", "referrerType", "surface"],
  funnel_started: ["experiment_key", "funnel_name", "lead_source_surface", "step_name", "variant_key"],
  home_value_started: ["experiment_key", "funnel_name", "lead_source_surface", "variant_key"],
  address_started: ["funnel_name", "lead_source_surface", "step_name"],
  address_entered: ["funnel_name", "lead_source_surface", "step_name"],
  address_submit: ["experiment_key", "funnel_name", "lead_source_surface", "step_name", "variant_key"],
  address_submitted: ["experiment_key", "funnel_name", "lead_source_surface", "step_name", "variant_key"],
  intent_selected: ["funnel_name", "intent", "lead_source_surface", "leadType", "step_name"],
  question_submitted: ["funnel_name", "lead_source_surface", "step_name"],
  intake_step_completed: ["from_step", "step"],
  intake_completed: ["funnel_name", "step_name"],
  intake_abandoned: ["funnel_name", "step", "step_name"],
  timeline_selected: ["funnel_name", "step_name", "timeline"],
  contact_submitted: ["funnel_name", "lead_source_surface", "step_name"],
  contact_info_submitted: ["funnel_name", "lead_source_surface", "step_name"],
  email_submit: ["funnel_name", "step_name"],
  email_submitted: ["funnel_name", "step_name"],
  phone_submit: ["funnel_name", "step_name"],
  phone_submitted: ["funnel_name", "step_name"],
  consent_accepted: ["consent_language_version", "funnel_name"],
  consent_granted: ["consent_language_version", "funnel_name"],
  consent_declined: ["consent_language_version", "funnel_name"],
  hero_cta_click: ["funnel_name", "step_name", "surface"],
  cta_chip_clicked: ["chip", "surface"],
  cta_click: ["action", "chip", "cta", "from_step", "hasAddress", "surface"],
  appointment_click: ["funnel_name", "request_surface", "step_name"],
  appointment_cta_clicked: ["funnel_name", "request_surface", "surface"],
  appointment_requested: ["funnel_name", "request_surface", "surface"],
  phone_click: ["surface"],
  email_click: ["surface"],
  call_button_clicked: ["surface"],
  chat_started: ["funnel_name", "lead_source_surface", "step_name"],
  chat_opened: ["funnel_name", "lead_source_surface", "surface"],
  chat_message_sent: ["funnel_name", "lead_source_surface", "surface"],
  seller_form_submit: ["funnel_name", "lead_source_surface", "step_name"],
  lead_created: ["experiment_key", "funnel_name", "lead_source_surface", "step_name", "variant_key"],
  lead_qualified: ["funnel_name", "lead_source_surface", "step_name"],
  thank_you_viewed: ["funnel_name", "step_name"],
  widget_opened: ["page_url", "surface"],
  widget_closed: ["surface"],
  widget_started: ["surface"],
  widget_lead_started: ["funnel_name", "step_name", "surface"],
  widget_intent_selected: ["intent", "leadType"],
  widget_question_answered: ["intent", "questionKey"],
  widget_step_completed: ["funnel_name", "step_name"],
  widget_contact_submitted: ["hasEmail", "hasPhone"],
  widget_lead_created: ["funnel_name", "step_name"],
  widget_cta_clicked: ["cta"],
  widget_submit_failed: [],
  review_plan_started: ["focus", "goal", "horizon"],
  review_plan_saved: ["completed_count", "focus", "goal", "horizon"],
  review_plan_task_completed: ["completed_count", "focus", "goal", "horizon", "task_id"],
  review_plan_handoff_clicked: ["completed_count", "focus", "goal", "horizon"],
};

const STRING_PROPERTY_KEYS = new Set([
  "action",
  "adapter",
  "allocatedQueue",
  "capturePath",
  "chip",
  "confidence",
  "consent_language_version",
  "context",
  "cta",
  "device_category",
  "deviceType",
  "eventType",
  "experiment_key",
  "focus",
  "funnel_name",
  "goal",
  "grade",
  "horizon",
  "intent",
  "intentCategory",
  "kind",
  "lead_source_surface",
  "leadTemperature",
  "leadType",
  "listingId",
  "metric_code",
  "metric_id",
  "navigation_type",
  "newStatus",
  "notification_type",
  "page",
  "placement",
  "placement_id",
  "primaryIntent",
  "priority",
  "provider",
  "questionKey",
  "rating",
  "referrerType",
  "request_surface",
  "source",
  "status",
  "step_name",
  "surface",
  "task_id",
  "temperature",
  "templateSlug",
  "timeline",
  "traffic_class",
  "type",
  "utmCampaign",
  "utmMedium",
  "utmSource",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "variant_key",
]);

const IDENTIFIER_PROPERTY_KEYS = new Set([
  "listingId",
  "metric_id",
  "placement_id",
  "task_id",
]);

const PATH_PROPERTY_KEYS = new Set([
  "current_path",
  "landingPath",
  "page_url",
  "path",
]);

const NUMBER_PROPERTY_KEYS = new Set([
  "buyerScore",
  "completed_count",
  "compositeScore",
  "errorCount",
  "factorCount",
  "from_step",
  "len",
  "matchCount",
  "metric_value",
  "okCount",
  "score",
  "sellerScore",
  "spamScore",
  "step",
  "totalRows",
  "totalScanned",
]);

const BOOLEAN_PROPERTY_KEYS = new Set([
  "call",
  "contactCreated",
  "email",
  "hasAddress",
  "hasEmail",
  "hasPhone",
  "is_test",
  "rescore",
  "sms",
  "spamSuspect",
]);

const ENUM_VALUES: Partial<Record<string, ReadonlySet<string>>> = {
  action: new Set(["intake_step_back"]),
  chip: new Set(["home_worth", "should_sell_now", "talk_to_mike", "tour_home", "what_can_afford"]),
  context: new Set(["iframe"]),
  cta: new Set(["call_mike", "call_mike_after_error"]),
  device_category: new Set(["desktop", "mobile", "tablet", "unknown"]),
  deviceType: new Set(["desktop", "mobile", "tablet", "unknown"]),
  focus: new Set(["clarity", "preparation", "timing", "local_context"]),
  funnel_name: new Set([
    "ask_mike_chat",
    "buyer",
    "home_value",
    "homepage",
    "open_house",
    "renter",
    "review_planner",
    "seller",
    "widget",
    "widget_preview",
  ]),
  goal: new Set(["buyer", "homeowner", "relocation", "seller"]),
  horizon: new Set(["30_days", "90_days", "6_months", "exploring"]),
  intent: new Set([
    "both",
    "buy",
    "cash_offer",
    "general_question",
    "home_value",
    "invest",
    "listing_inquiry",
    "open_house",
    "relocate",
    "renter",
    "sell",
    "unknown",
  ]),
  lead_source_surface: new Set([
    "ask_page",
    "buyer_page",
    "home_value_page",
    "homepage",
    "open_house",
    "ourtownproperties",
    "seller_page",
    "widget",
  ]),
  leadType: new Set([
    "agent_referral",
    "buyer",
    "general_question",
    "home_value",
    "investor",
    "listing_inquiry",
    "relocation",
    "renter",
    "seller",
    "seller_cash_offer",
    "unknown",
  ]),
  page: new Set(["embed_ask"]),
  questionKey: new Set(["address", "budget", "city", "condition", "listing", "timeline"]),
  referrerType: new Set(["direct", "email", "organic", "paid", "referral", "social"]),
  request_surface: new Set([
    "ask_page",
    "buyer_page",
    "home_value_page",
    "homepage",
    "open_house",
    "ourtownproperties",
    "seller_page",
    "widget",
  ]),
  step_name: new Set([
    "address",
    "appointment_request",
    "email",
    "hero",
    "landing",
    "message_focus",
    "message_sent",
    "phone",
    "phone_timeline",
    "seller_intent",
    "thank_you",
  ]),
  surface: new Set([
    "ai_demo_section",
    "ask_page",
    "buyer_page",
    "faq_strip",
    "hero",
    "home_value_page",
    "homepage",
    "landing_hero",
    "landing_nav",
    "mike_card_contact",
    "mike_card_cta",
    "mobile_nav",
    "open_house",
    "ourtownproperties",
    "seller_page",
    "widget",
  ]),
  timeline: new Set([
    "ASAP",
    "30-60 days",
    "3-6 months",
    "Just planning",
    "asap",
    "0_30_days",
    "31_90_days",
    "3_6_months",
    "6_plus_months",
    "unknown",
  ]),
};

const PUBLIC_ANALYTICS_EVENTS = new Set(Object.keys(PUBLIC_EVENT_PROPERTY_KEYS));

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function hasSensitiveContent(value: string) {
  const candidates = [value, decoded(value)];
  return candidates.some((candidate) =>
    hasControlCharacter(candidate) ||
    EMAIL_PATTERN.test(candidate) ||
    PHONE_PATTERN.test(candidate) ||
    SECRET_PATTERN.test(candidate) ||
    SENSITIVE_QUERY_PATTERN.test(candidate)
  );
}

export function safeAnalyticsDimension(
  value: unknown,
  maxLength = MAX_DIMENSION_LENGTH,
): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > maxLength) return null;
  if (hasSensitiveContent(candidate)) return null;
  if (!DIMENSION_PATTERN.test(candidate) || /:\/\//.test(candidate)) return null;
  return candidate;
}

export function safeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let candidate = value.trim();
  if (!candidate || candidate.length > 2_048 || hasSensitiveContent(candidate)) return null;
  try {
    if (/^https?:\/\//i.test(candidate)) candidate = new URL(candidate).pathname;
  } catch {
    return null;
  }
  candidate = candidate.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (candidate.length > MAX_PATH_LENGTH || !candidate.startsWith("/")) return null;
  if (/^\/open-house\/[^/?#]{1,160}$/.test(candidate)) return "/open-house/[property-or-id]";
  return SAFE_PUBLIC_PATHS.has(candidate) ? candidate : null;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_SAFE_NUMBER
    ? value
    : undefined;
}

function safeStringProperty(key: string, value: unknown) {
  const dimension = safeAnalyticsDimension(value);
  if (!dimension) return undefined;
  const allowedValues = ENUM_VALUES[key];
  if (allowedValues && !allowedValues.has(dimension)) return undefined;
  if (IDENTIFIER_PROPERTY_KEYS.has(key) && !IDENTIFIER_PATTERN.test(dimension)) return undefined;
  return dimension;
}

export function safeAnalyticsProperties(
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (Object.keys(safe).length >= MAX_PROPERTIES) break;
    if (key === "route") {
      const route = typeof value === "string" && value.trim().startsWith("/")
        ? safeAnalyticsPath(value)
        : safeStringProperty(key, value);
      if (route) safe[key] = route;
      continue;
    }
    if (PATH_PROPERTY_KEYS.has(key)) {
      const path = safeAnalyticsPath(value);
      if (path) safe[key] = path;
      continue;
    }
    if (NUMBER_PROPERTY_KEYS.has(key)) {
      const number = safeNumber(value);
      if (number !== undefined) safe[key] = number;
      continue;
    }
    if (BOOLEAN_PROPERTY_KEYS.has(key)) {
      if (typeof value === "boolean") safe[key] = value;
      continue;
    }
    if (STRING_PROPERTY_KEYS.has(key)) {
      const stringValue = safeStringProperty(key, value);
      if (stringValue !== undefined) safe[key] = stringValue;
    }
  }
  return safe;
}

export function isApprovedPublicAnalyticsEvent(eventName: string) {
  return PUBLIC_ANALYTICS_EVENTS.has(eventName);
}

export function safePublicAnalyticsProperties(
  eventName: string,
  properties: Record<string, unknown> = {},
) {
  const eventKeys = PUBLIC_EVENT_PROPERTY_KEYS[eventName];
  if (!eventKeys) return {};
  const allowed = new Set<string>([...PUBLIC_ATTRIBUTION_KEYS, ...eventKeys, "is_test"]);
  const safe = safeAnalyticsProperties(properties);
  return Object.fromEntries(Object.entries(safe).filter(([key]) => allowed.has(key)));
}

export function coarseAnalyticsUserAgent(
  rawUserAgent: string | null | undefined,
  deviceHint?: unknown,
): string | null {
  const raw = rawUserAgent?.trim() ?? "";
  if (!raw) return null;
  if (/^(?:automation|browser)\/(?:desktop|mobile|tablet|unknown)$/.test(raw)) return raw;
  const hinted = safeAnalyticsDimension(deviceHint, 16);
  const device = hinted && new Set(["desktop", "mobile", "tablet", "unknown"]).has(hinted)
    ? hinted
    : /iPad|Tablet/i.test(raw)
      ? "tablet"
      : /Android|iPhone|iPod|Mobile/i.test(raw)
        ? "mobile"
        : "desktop";
  const automation = !/Mozilla\/5\.0/i.test(raw) ||
    /(?:bot|crawler|curl|headless|insomnia|lighthouse|playwright|postman|spider|wget)/i.test(raw);
  return `${automation ? "automation" : "browser"}/${device}`;
}
