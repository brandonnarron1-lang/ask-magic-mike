export type FunnelType =
  | "home_value"
  | "seller"
  | "buyer"
  | "renter"
  | "open_house"
  | "chat"
  | "appointment"
  | "widget";

export type LeadSourceSurface =
  | "homepage"
  | "home_value_page"
  | "seller_page"
  | "buyer_page"
  | "renter_page"
  | "open_house"
  | "ask_page"
  | "widget"
  | "ourtownproperties";

export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_page?: string;
  initial_path?: string;
  current_path?: string;
  parent_url?: string;
  embed_host?: string;
  placement?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  page_title?: string;
  placement_id?: string;
  listing_id?: string;
  property_id?: string;
  agent_id?: string;
  first_touch?: Record<string, string | undefined>;
  last_touch?: Record<string, string | undefined>;
  device_category?: string;
  created_at?: string;
};

export type LeadPayload = {
  funnel_type: FunnelType;
  lead_source_surface: LeadSourceSurface;
  lead_type?: string;
  address?: string;
  property_address?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  target_geography?: string;
  financing?: string;
  preapproval?: boolean;
  listing_id?: string;
  property_id?: string;
  agent_id?: string;
  timeline?: string;
  condition?: string;
  notes?: string;
  question?: string;
  page_url?: string;
  widget_session_id?: string;
  idempotency_key?: string;
  honeypot?: string;
  is_test?: boolean;
  consent?: boolean;
  consent_email?: boolean;
  consent_call?: boolean;
  consent_sms?: boolean;
  consent_language_version?: string;
  consent_language_text?: string;
  consent_source?: string;
  attribution: Attribution;
  status: "new";
  assigned_agent_id: string | null;
  created_at?: string;
};

export function clean(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text;
}

export function cleanOptional(value: unknown) {
  const text = clean(value);
  return text || undefined;
}

export function normalizeLeadPayload(input: Record<string, unknown>): LeadPayload {
  const attribution = cleanAttribution(input.attribution);
  const funnelType = normalizeFunnelType(input.funnel_type);
  const qaMarkerText = [
    input.name,
    input.first_name,
    input.last_name,
    input.notes,
    input.question,
    input.intent,
    input.address,
    input.property_address,
  ]
    .map(clean)
    .join(" ")
    .toUpperCase();
  const isInternalQa =
    qaMarkerText.includes("INTERNAL QA") &&
    qaMarkerText.includes("DO NOT CONTACT");

  return {
    funnel_type: funnelType,
    lead_source_surface: normalizeSurface(input.lead_source_surface, funnelType),
    lead_type: cleanOptional(input.lead_type),
    address: cleanOptional(input.address || input.property_address),
    property_address: cleanOptional(input.property_address || input.address),
    name: cleanOptional(input.name),
    first_name: cleanOptional(input.first_name),
    last_name: cleanOptional(input.last_name),
    email: cleanOptional(input.email),
    phone: cleanOptional(input.phone),
    city: cleanOptional(input.city),
    target_geography: cleanOptional(input.target_geography),
    financing: cleanOptional(input.financing),
    preapproval: typeof input.preapproval === "boolean" ? input.preapproval : undefined,
    listing_id: cleanOptional(input.listing_id),
    property_id: cleanOptional(input.property_id),
    agent_id: cleanOptional(input.agent_id),
    timeline: cleanOptional(input.timeline),
    condition: cleanOptional(input.condition || input.property_condition),
    notes: cleanOptional(input.notes),
    question: cleanOptional(input.question || input.intent),
    page_url: cleanOptional(input.page_url),
    widget_session_id: cleanOptional(input.widget_session_id),
    idempotency_key: cleanOptional(input.idempotency_key || input.request_fingerprint),
    honeypot: clean(input.website || input.honeypot),
    is_test: input.is_test === true || isInternalQa,
    consent: input.consent === true,
    consent_email: input.consent_email === true,
    consent_call: input.consent_call === true,
    consent_sms: input.consent_sms === true,
    consent_language_version: cleanOptional(input.consent_language_version),
    consent_language_text: cleanOptional(input.consent_language_text),
    consent_source: cleanOptional(input.consent_source),
    attribution,
    status: "new",
    assigned_agent_id: null,
    created_at: new Date().toISOString(),
  };
}

export function cleanAttribution(input: unknown): Attribution {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const clickIds = raw.click_ids && typeof raw.click_ids === "object" && !Array.isArray(raw.click_ids)
    ? raw.click_ids as Record<string, unknown>
    : {};
  return {
    source: cleanOptional(raw.source),
    medium: cleanOptional(raw.medium),
    campaign: cleanOptional(raw.campaign),
    content: cleanOptional(raw.content),
    term: cleanOptional(raw.term),
    referrer: cleanOptional(raw.referrer),
    landing_page: cleanOptional(raw.landing_page),
    initial_path: cleanOptional(raw.initial_path),
    current_path: cleanOptional(raw.current_path),
    parent_url: cleanOptional(raw.parent_url),
    embed_host: cleanOptional(raw.embed_host),
    placement: cleanOptional(raw.placement),
    gclid: cleanOptional(raw.gclid || clickIds.gclid),
    gbraid: cleanOptional(raw.gbraid || clickIds.gbraid),
    wbraid: cleanOptional(raw.wbraid || clickIds.wbraid),
    fbclid: cleanOptional(raw.fbclid || clickIds.fbclid),
    msclkid: cleanOptional(raw.msclkid || clickIds.msclkid),
    page_title: cleanOptional(raw.page_title),
    placement_id: cleanOptional(raw.placement_id || raw.placement),
    listing_id: cleanOptional(raw.listing_id),
    property_id: cleanOptional(raw.property_id),
    agent_id: cleanOptional(raw.agent_id),
    first_touch: cleanAttributionSnapshot(raw.first_touch),
    last_touch: cleanAttributionSnapshot(raw.last_touch),
    device_category: cleanOptional(raw.device_category),
    created_at: cleanOptional(raw.created_at),
  };
}

function normalizeFunnelType(input: unknown): FunnelType {
  if (
    input === "seller" ||
    input === "buyer" ||
    input === "renter" ||
    input === "open_house" ||
    input === "chat" ||
    input === "appointment" ||
    input === "widget"
  ) {
    return input;
  }
  return "home_value";
}

function normalizeSurface(input: unknown, funnelType: FunnelType): LeadSourceSurface {
  if (
    input === "homepage" ||
    input === "home_value_page" ||
    input === "seller_page" ||
    input === "buyer_page" ||
    input === "renter_page" ||
    input === "open_house" ||
    input === "ask_page" ||
    input === "widget" ||
    input === "ourtownproperties"
  ) {
    return input;
  }
  if (funnelType === "seller") return "seller_page";
  if (funnelType === "buyer") return "buyer_page";
  if (funnelType === "renter") return "renter_page";
  if (funnelType === "open_house") return "open_house";
  if (funnelType === "chat") return "ask_page";
  if (funnelType === "widget") return "widget";
  return "home_value_page";
}

function cleanAttributionSnapshot(input: unknown) {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fields = [
    "source",
    "medium",
    "campaign",
    "content",
    "term",
    "referrer",
    "landing_page",
    "current_path",
    "parent_url",
    "embed_host",
    "placement",
    "placement_id",
    "listing_id",
    "property_id",
    "agent_id",
    "page_title",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
    "msclkid",
  ];
  return Object.fromEntries(
    fields
      .map((field) => [field, cleanOptional(raw[field])] as const)
      .filter(([, value]) => Boolean(value)),
  );
}
