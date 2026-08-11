import type { LeadPayload } from "./leadPayload";

export type LeadRoutingDecision = {
  owner: "mike" | "unassigned";
  routingReason: string;
  sourceLabel: string;
  intentLabel: string;
};

export function sourceLabelForPayload(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  const source = attribution.source || (payload.lead_source_surface === "widget" ? "Ask Magic Mike widget" : payload.lead_source_surface);
  const placement = attribution.placement_id || attribution.placement;
  const host = attribution.embed_host;
  return [source, placement, host].filter(Boolean).join(" / ") || "Ask Magic Mike public form";
}

export function intentLabelForPayload(payload: LeadPayload) {
  if (payload.lead_type === "home_value" || payload.funnel_type === "home_value") return "Home Value";
  if (payload.lead_type === "seller" || payload.funnel_type === "seller") return "Seller";
  if (payload.lead_type === "buyer" || payload.funnel_type === "buyer") return "Property Match";
  if (payload.lead_type === "renter" || payload.funnel_type === "renter") return "Renter-to-Homeownership";
  if (payload.lead_type === "listing_inquiry") return "Listing Inquiry";
  if (payload.lead_type === "open_house") return "Open House";
  return "General Question";
}

export function routeLead(payload: LeadPayload, score: number): LeadRoutingDecision {
  const intent = intentLabelForPayload(payload);
  const source = sourceLabelForPayload(payload);
  return {
    owner: "mike",
    routingReason: `${intent} from ${source}; no separately approved recipient mapping is configured.`,
    sourceLabel: source,
    intentLabel: intent,
  };
}
