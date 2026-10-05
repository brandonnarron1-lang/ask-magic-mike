import type { AdminLeadView,AdminLeadDetailResult } from "./persistence/supabase/adminLeadView";
import { canAccessAssignedLead, hasLeadCenterPermission, type LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

export const LEAD_PRESENTATION_VERSION = "reference_cards_v1";
export const LEAD_MODULES = {
  buyer: { title: "Hot Buyer Lead Alert", label: "Buyer", accent: "#FF8794", surface: "#421A22", media: "buyer" },
  seller: { title: "Seller Home Value Lead", label: "Seller", accent: "#75DFC1", surface: "#14382E", media: "seller" },
  cash_seller: { title: "Cash Offer / Investor Lead", label: "Cash-offer seller", accent: "#D9AF52", surface: "#392E17", media: "cash" },
  investor_buyer: { title: "Cash Offer / Investor Lead", label: "Investor buyer", accent: "#D9AF52", surface: "#392E17", media: "investor" },
  copilot: { title: "AI + Human Conversation Copilot", label: "Draft review", accent: "#78DDED", surface: "#16323A", media: "copilot" },
  routing: { title: "Smart Routing + Next Steps", label: "Routing review", accent: "#D9AF52", surface: "#392E17", media: "routing" },
} as const;
export type LeadSubtype = keyof typeof LEAD_MODULES;
export type DisclosureTier = "pre_claim" | "assigned" | "supervisor" | "audit";
export type OfferState = "offered" | "accepted" | "claimed_elsewhere" | "expired" | "paused" | "blocked" | "failed_delivery" | "missing_data";
export type LeadCardAction = { id: string; label: string; href?: string; disabledReason?: string };
export type LeadOfferSnapshot = { id: string; reference: string; version: number; agentId: string; deadline: string; state: OfferState; code?: string };
export type LeadPresentation = {
  version: typeof LEAD_PRESENTATION_VERSION; subtype: LeadSubtype; disclosure: DisclosureTier;
  reference: string; isTest: boolean; priority: "HOT" | "ACTIVE" | "NEW" | "TEST";
  score: number | null; reasons: string[]; location: string; source: string; timeline: string;
  budget: string; financing: string; propertyEvidence: string; custodian: string;
  identity?: { name: string; email: string | null; phone: string | null; address: string | null; question: string | null };
  offer?: LeadOfferSnapshot; nextAction: string; draftStatus: string; insight: string;
  actions: LeadCardAction[]; steps: Array<{ label: string; state: "complete" | "pending" | "blocked" | "not_applicable" }>;
};

export function leadSubtype(lead: Pick<AdminLeadView, "funnel_type">): LeadSubtype {
  const intent = lead.funnel_type.toLowerCase();
  if (/investor|investment/.test(intent)) return "investor_buyer";
  if (/cash|direct_purchase|sell_soon/.test(intent)) return "cash_seller";
  if (/buy|property_match/.test(intent)) return "buyer";
  if (/sell|value/.test(intent)) return "seller";
  return "routing";
}

/** Only called after canonical server reads. The output, not hidden CSS, is
 * the disclosure boundary. Audit copies and pre-claim offers contain no PII. */
export function presentLead(input: {
  lead: AdminLeadView; principal: LeadCenterPrincipal; tier: DisclosureTier;
  offer?: LeadOfferSnapshot; subtype?: LeadSubtype;
  evidence?: Pick<AdminLeadDetailResult,"appointments"|"followupTasks"|"outcomes">;
}): LeadPresentation {
  const { lead, principal, tier, offer } = input;
  const full = (tier === "assigned" || tier === "supervisor") && canAccessAssignedLead(principal, lead.assigned_agent_id);
  const intendedOffer = hasLeadCenterPermission(principal.role,"lead:view_assigned") && (offer?.agentId === principal.agentId || hasLeadCenterPermission(principal.role, "routing:manage"));
  if (!full && tier !== "audit" && !intendedOffer) throw new Error("lead_presentation_forbidden");
  if (tier === "audit" && !hasLeadCenterPermission(principal.role, "audit:view")) throw new Error("audit_presentation_forbidden");
  const subtype = input.subtype || leadSubtype(lead);
  const score = lead.score ?? null;
  const isTest = lead.is_test;
  const base = `/admin/leads/${encodeURIComponent(lead.id)}`;
  const update = full && hasLeadCenterPermission(principal.role, "lead:update_assigned");
  // Intent/location evidence is explicitly sourced; never derive a town from
  // address/free text, or assume a pictured property is the lead's property.
  const result: LeadPresentation = {
    version: LEAD_PRESENTATION_VERSION, subtype, disclosure: full ? tier : tier === "audit" ? "audit" : "pre_claim",
    reference: offer?.reference || `AMM-${lead.id.slice(0, 8).toUpperCase()}`, isTest,
    priority: isTest ? "TEST" : score !== null && score >= 80 ? "HOT" : score !== null && score >= 60 ? "ACTIVE" : "NEW",
    score, reasons: full ? (lead.score_reasons || []).slice(0, 5) : ["Qualification details available after authorized assignment."],
    location: ["Wilson","Elm City","Lucama","Stantonsburg","Sims","Kenly"].includes(lead.stated_city || "") ? lead.stated_city! : "Area to verify", source: full ? lead.attribution_summary : "Owned intake",
    timeline: full ? lead.timeline || "Timeline not recorded" : "Review in Lead Center",
    budget: "Not recorded", financing: full && lead.stated_financing ? `Self-reported: ${lead.stated_financing} — verify evidence` : full && typeof lead.stated_preapproval==="boolean" ? `Preapproval self-reported ${lead.stated_preapproval?"yes":"no"} — not independently verified` : "Unknown — evidence required", propertyEvidence: "Property facts and current availability unverified",
    custodian: lead.assigned_agent_id ? "Assigned custodian" : "Mike / admin review",
    nextAction: isTest ? "INTERNAL QA — DO NOT CONTACT" : "Review facts and communication permission before follow-up.",
    draftStatus: "Human review required; approval does not send",
    insight: subtype === "copilot" ? "Verify current availability before proposing a showing. No availability or appointment is confirmed." : "Broker review required. No automated valuation, binding offer, or financing claim.",
    actions: full ? [{ id: "open", label: "Open saved lead", href: base },
      { id: "call", label: "Review call permission", ...(update && !isTest && !lead.communication_suppressed && lead.phone ? { href: `${base}#contact-review` } : { disabledReason: "Review contact permission; test/suppressed records cannot be contacted." }) },
      { id: "text", label: "Review message", ...(update ? { href: `${base}#message-review` } : { disabledReason: "Assigned editor permission required." }) },
      { id: "prepare", label: subtype === "seller" ? "Prepare CMA review" : subtype === "cash_seller" || subtype === "investor_buyer" ? "Prepare analysis" : subtype === "copilot" ? "Review AI draft" : "Request appointment", ...(update ? { href: `${base}#${["seller","cash_seller","investor_buyer"].includes(subtype)?"property-evidence-review":subtype==="copilot"?"next-action-review":"appointment-review"}` } : { disabledReason: "Assigned editor permission required." }) }]
      : offer && intendedOffer && tier !== "audit" ? [{ id: "review", label: "Review Claim / Pass", href: `/admin/allocation/offers/${offer.id}` }] : [],
    steps: [{ label: "Assignment", state: lead.assigned_agent_id ? "complete" : "pending" },
      { label: "Human contact", state: full && lead.last_contacted_at ? "complete" : "pending" },
      { label: "Appointment request", state: full && input.evidence?.appointments.some(a=>["requested","scheduled","confirmed","completed"].includes(a.status)) ? "complete" : "pending" },
      { label: "Appointment confirmation", state: full && input.evidence?.appointments.some(a=>Boolean(a.confirmed_at)&&["confirmed","completed"].includes(a.status)) ? "complete" : "pending" },
      { label: "Next task recorded", state: full && input.evidence?.followupTasks.some(task=>task.status==="open"||task.status==="in_progress") ? "complete" : "pending" },
      { label: "Reviewed packet", state: ["seller","cash_seller","investor_buyer"].includes(subtype)?"blocked":"not_applicable" },
      { label: "Documented outcome", state: full && input.evidence?.outcomes.length ? "complete" : "pending" }],
  };
  if (full) result.identity = { name: lead.name || "Name not recorded", email: lead.email, phone: lead.phone, address: lead.address, question: lead.question };
  if (offer && intendedOffer && tier !== "audit") result.offer = { ...offer, code: undefined };
  return result;
}

/** Transport and subject projection: no identity, exact address, free text,
 * financing, budget, code, or private media. Never serialize the input DTO. */
export function lockScreenPresentation(view: LeadPresentation): LeadPresentation {
  const { identity: _identity, offer, ...safe } = view;
  void _identity;
  return { ...safe, disclosure: "pre_claim", source: "Owned intake", timeline: "Review in Lead Center", budget: "Private in Lead Center",
    financing: "Private in Lead Center", reasons: [], actions: [],
    insight: "Review the current authenticated record before acting.",
    offer: offer ? { ...offer, code: undefined } : undefined };
}

export function offerDeadline(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_offer_deadline");
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(date);
}
