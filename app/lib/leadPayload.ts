export type FunnelType = "home_value" | "seller" | "chat" | "appointment" | "widget";

export type LeadSourceSurface =
  | "homepage"
  | "home_value_page"
  | "seller_page"
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
  fbclid?: string;
  device_category?: string;
  created_at?: string;
};

export type LeadPayload = {
  funnel_type: FunnelType;
  lead_source_surface: LeadSourceSurface;
  address?: string;
  property_address?: string;
  name?: string;
  email?: string;
  phone?: string;
  timeline?: string;
  condition?: string;
  notes?: string;
  question?: string;
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

  return {
    funnel_type: funnelType,
    lead_source_surface: normalizeSurface(input.lead_source_surface, funnelType),
    address: cleanOptional(input.address || input.property_address),
    property_address: cleanOptional(input.property_address || input.address),
    name: cleanOptional(input.name),
    email: cleanOptional(input.email),
    phone: cleanOptional(input.phone),
    timeline: cleanOptional(input.timeline),
    condition: cleanOptional(input.condition),
    notes: cleanOptional(input.notes),
    question: cleanOptional(input.question),
    attribution,
    status: "new",
    assigned_agent_id: null,
    created_at: new Date().toISOString(),
  };
}

export function cleanAttribution(input: unknown): Attribution {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
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
    gclid: cleanOptional(raw.gclid),
    fbclid: cleanOptional(raw.fbclid),
    device_category: cleanOptional(raw.device_category),
    created_at: cleanOptional(raw.created_at),
  };
}

function normalizeFunnelType(input: unknown): FunnelType {
  if (
    input === "seller" ||
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
    input === "ask_page" ||
    input === "widget" ||
    input === "ourtownproperties"
  ) {
    return input;
  }
  if (funnelType === "seller") return "seller_page";
  if (funnelType === "chat") return "ask_page";
  if (funnelType === "widget") return "widget";
  return "home_value_page";
}
