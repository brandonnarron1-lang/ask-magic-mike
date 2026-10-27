import type { AdminLeadView } from "./persistence/supabase/adminLeadView";
import { normalizeAddressValue, type AddressValue } from "./address/addressValue";
import { normalizeBuyerInterest, type BuyerInterestV1 } from "./buyerInterest";
import { leadOwnership } from "./leadOwnership";
import { isTerminalContactRecord } from "./manualContactReview";

/** Human-review reference supplied/observed on this date, not a compliance receipt
 * or a promoted AI source. No network lookup is performed by this projection. */
export const NC_AGENCY_REVIEW_REFERENCE = {
  url: "https://bulletins.ncrec.gov/working-with-real-estate-agents-disclosure-update/",
  observedOn: "2026-10-27",
  version: "wwrea-human-review-observation-2026-10-27",
} as const;

export type QualificationEvidence = Readonly<{
  inquiryId: string;
  field: keyof AdminLeadView | `address_entry.${string}` | `buyer_interest.${string}`;
  source: "client_reported" | "retained_intake" | "operational_record";
  /** Inquiry creation only; field-level capture/verification times are not retained. */
  capturedAt: string | null;
  capturedAtBasis: "inquiry_created_at" | "not_recorded";
}>;

export type QualificationUnknown = Readonly<{
  state: "unknown";
  value: null;
  label: "Not recorded";
  question: string | null;
  evidence: readonly [];
}>;

/** Fact means a retained entry, never independent verification. Values are
 * untrusted plain text: render as text, not HTML, instructions or fetched URLs. */
export type QualificationField<T extends string | number | boolean> = Readonly<{
  state: "fact";
  value: T;
  evidence: readonly QualificationEvidence[];
}> | QualificationUnknown;

type BuyerProperty = Readonly<{
  address: QualificationField<string>;
  unit: QualificationField<string>;
  listingUrl: QualificationField<string>;
  reference: QualificationField<string>;
}>;

export type QualificationBuyerInterest = Readonly<{
  kind: "specific";
  properties: readonly BuyerProperty[];
}> | Readonly<{
  kind: "search";
  desiredArea: QualificationField<string>;
  /** Entered range only; never suitability, ranking or a follow-up question. */
  budgetRange: QualificationField<string>;
}> | Readonly<{ kind: "not_recorded" }>;

export type QualificationHold = Readonly<{
  code: "test" | "qa" | "suppressed" | "terminal";
  message: string;
}>;
export type QualificationQuestion = Readonly<{ field: string; question: string }>;

export type LeadQualificationDossier = Readonly<{
  version: "qualification_dossier_v1";
  inquiryId: string;
  canonicalLeadId: string;
  /** Read ownership only: not representation, a requested agent or mutation authority. */
  ownership: Readonly<{ kind: "direct" | "inherited" | "unassigned"; agentId: string | null }>;
  intent: QualificationField<string>;
  property: Readonly<{
    addressEntryState: "retained" | "not_recorded" | "invalid";
    enteredAddress: QualificationField<string>;
    address: QualificationField<string>;
    unit: QualificationField<string>;
    country: QualificationField<string>;
    region: QualificationField<string>;
    locality: QualificationField<string>;
    county: QualificationUnknown;
  }>;
  buyerInterest: QualificationBuyerInterest;
  timeframe: Readonly<{ text: QualificationField<string>; months: QualificationField<number> }>;
  enteredFacts: Readonly<{
    condition: QualificationField<string>;
    financing: QualificationField<string>;
    preapproval: QualificationField<boolean>;
  }>;
  agency: Readonly<{
    representation: QualificationUnknown;
    relationship: QualificationUnknown;
    requestedAgent: QualificationUnknown;
  }>;
  jurisdiction: Readonly<{
    state: "nc" | "other_reported" | "unknown";
    ncHumanReviewRequired: boolean;
    message: string;
    reference: typeof NC_AGENCY_REVIEW_REFERENCE | null;
  }>;
  holds: readonly QualificationHold[];
  questions: readonly QualificationQuestion[];
  nextStep: Readonly<{
    kind: "hold" | "clarify" | "human_review";
    field: string | null;
    message: string;
  }>;
  limitations: readonly string[];
}>;

// Reject overlong entries rather than truncate them into different factual claims.
function text(value: unknown, maximum: number): string | null {
  if (typeof value !== "string" || value.length > maximum || Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })) return null;
  return value.trim() || null;
}

function unknown(question: string | null = null): QualificationUnknown {
  return { state: "unknown", value: null, label: "Not recorded", question, evidence: [] };
}

/** Pure read projection for an already-authorized AdminLeadView. No reads,
 * writes, model, note parsing, permission decisions or routing qualification.
 * Per-inquiry evidence never moves to the canonical ownership record. */
export function buildLeadQualificationDossier(lead: AdminLeadView): LeadQualificationDossier {
  const createdAt = text(lead.created_at, 40);
  const capturedAt = createdAt && /^\d{4}-\d{2}-\d{2}T/.test(createdAt) && Number.isFinite(Date.parse(createdAt)) ? createdAt : null;
  const evidence = (field: QualificationEvidence["field"], source: QualificationEvidence["source"] = "client_reported"): readonly QualificationEvidence[] => [{
    inquiryId: lead.id, field, source, capturedAt,
    capturedAtBasis: capturedAt ? "inquiry_created_at" : "not_recorded",
  }];
  const fact = <T extends string | number | boolean>(value: T, field: QualificationEvidence["field"], source?: QualificationEvidence["source"]): QualificationField<T> => ({
    state: "fact", value, evidence: evidence(field, source),
  });
  const entered = (value: unknown, field: QualificationEvidence["field"], maximum: number, question: string | null = null): QualificationField<string> => {
    const bounded = text(value, maximum);
    return bounded === null ? unknown(question) : fact(bounded, field);
  };

  let address: AddressValue | null = null;
  let addressEntryState: LeadQualificationDossier["property"]["addressEntryState"] = "not_recorded";
  if (lead.address_entry !== undefined && lead.address_entry !== null) {
    try { address = normalizeAddressValue(lead.address_entry); addressEntryState = "retained"; }
    catch { addressEntryState = "invalid"; }
  }
  let interest: BuyerInterestV1 | null = null;
  if (lead.buyer_interest !== undefined && lead.buyer_interest !== null) {
    try { interest = normalizeBuyerInterest(lead.buyer_interest); }
    catch { /* Unsupported entries supply no property, geography or financial facts. */ }
  }
  const property: LeadQualificationDossier["property"] = {
    addressEntryState,
    enteredAddress: address ? fact(address.enteredText, "address_entry.enteredText") : unknown(),
    address: address ? fact(address.acceptedText, "address_entry.acceptedText") : entered(lead.address, "address", 500),
    unit: entered(address?.components.line2, "address_entry.components.line2", 100),
    country: entered(address?.components.country, "address_entry.components.country", 2, "In which country is the property or intended search?"),
    region: entered(address?.components.region, "address_entry.components.region", 80, "In which state or region is the property or intended search?"),
    locality: entered(address?.components.locality, "address_entry.components.locality", 100, "Which locality is the property in?"),
    county: unknown(),
  };

  const buyerInterest: QualificationBuyerInterest = interest?.kind === "specific" ? {
    kind: "specific",
    properties: interest.properties.map((item, index) => ({
      address: entered(item.address_text, `buyer_interest.properties.${index}.address_text`, 500),
      unit: entered(item.unit, `buyer_interest.properties.${index}.unit`, 100),
      listingUrl: entered(item.listing_url, `buyer_interest.properties.${index}.listing_url`, 2_048),
      reference: entered(item.reference, `buyer_interest.properties.${index}.reference`, 160),
    })),
  } : interest?.kind === "search" ? {
    kind: "search",
    desiredArea: entered(interest.desired_area, "buyer_interest.desired_area", 500),
    budgetRange: entered(interest.budget_range, "buyer_interest.budget_range", 160),
  } : { kind: "not_recorded" };

  const rawIntent = text(lead.funnel_type, 80);
  const intent = rawIntent && rawIntent.toLowerCase() !== "unknown"
    ? fact(rawIntent, "funnel_type", "retained_intake")
    : unknown("Is this a buying, selling, home-value or other real estate inquiry?");
  const months = typeof lead.timeline_months === "number" && Number.isFinite(lead.timeline_months) && lead.timeline_months >= 0
    ? fact(lead.timeline_months, "timeline_months") : unknown();
  const timeframe = {
    text: entered(lead.timeline, "timeline", 200, months.state === "unknown" ? "What timeframe would you like help with?" : null),
    months,
  };
  const agency = {
    // Assignment, self-reported consent, disclosure links and free text cannot
    // fill fields that AdminLeadView does not retain.
    representation: unknown("Are you currently represented by an agent for this inquiry?"),
    relationship: unknown("What agency relationship, if any, has been established with a broker?"),
    requestedAgent: unknown("Did you request a particular agent?"),
  };

  const country = property.country.value;
  const region = property.region.value;
  const state: LeadQualificationDossier["jurisdiction"]["state"] = !country || !region ? "unknown"
    : country === "US" && ["NC", "NORTH CAROLINA"].includes(region.toUpperCase()) ? "nc" : "other_reported";
  const jurisdiction: LeadQualificationDossier["jurisdiction"] = {
    state,
    ncHumanReviewRequired: state === "nc",
    message: state === "nc"
      ? "Client-reported US/NC only; jurisdiction unverified. A human broker must review Working With Real Estate Agents at first substantial contact, before substantive confidential discussion. Merely linking, sending or signing is not proof of compliance; a signature does not establish representation."
      : state === "other_reported"
        ? "Other client-reported jurisdiction; no NC-specific rule applied. A human must verify jurisdiction and applicable agency requirements."
        : "Jurisdiction not recorded in usable structured address fields. Clarify country and region; no NC-specific rule applied.",
    reference: state === "nc" ? NC_AGENCY_REVIEW_REFERENCE : null,
  };

  const status = text(lead.status, 80)?.toLowerCase();
  const stage = text(lead.conversion_stage, 80)?.toLowerCase();
  const holds: QualificationHold[] = [];
  if (lead.is_test) holds.push({ code: "test", message: "INTERNAL TEST — DO NOT CONTACT." });
  if ([status, stage].some(value => value && ["qa", "test", "internal_qa", "spam_test"].includes(value))) {
    holds.push({ code: "qa", message: "INTERNAL QA — DO NOT CONTACT." });
  }
  if (lead.communication_suppressed) holds.push({ code: "suppressed", message: "Communication suppressed — no contact progression." });
  if (isTerminalContactRecord(status, stage) || lead.converted_at || lead.closed_won_at || lead.closed_lost_at) {
    holds.push({ code: "terminal", message: "Terminal inquiry — human lifecycle review only; no contact progression." });
  }

  const questions: QualificationQuestion[] = [];
  const ask = (field: string, value: QualificationField<string | number | boolean>) => {
    if (value.state === "unknown" && value.question) questions.push({ field, question: value.question });
  };
  ask("intent", intent);
  ask("property.country", property.country);
  ask("property.region", property.region);
  // Buyer desired areas/listing references are not the inquiry address, the
  // buyer's residence, ownership evidence or structured jurisdiction.
  if (property.address.state === "unknown" && buyerInterest.kind === "not_recorded") {
    questions.push({ field: "property.address", question: "Is there a specific property (and unit, if applicable), or a desired search area?" });
  }
  ask("timeframe.text", timeframe.text);
  ask("agency.representation", agency.representation);
  ask("agency.relationship", agency.relationship);
  ask("agency.requestedAgent", agency.requestedAgent);

  const nextStep: LeadQualificationDossier["nextStep"] = holds.length ? {
    kind: "hold", field: null, message: holds.map(hold => hold.message).join(" "),
  } : state === "nc" ? {
    kind: "human_review", field: "agency", message: jurisdiction.message,
  } : questions.length ? {
    kind: "clarify", field: questions[0].field,
    message: `After separate access and communication-permission review, clarify only this non-confidential fact: ${questions[0].question}`,
  } : {
    kind: "human_review", field: "agency", message: "Human review of retained facts and agency requirements is needed; no readiness or permission is established.",
  };
  const owner = leadOwnership(lead);
  return {
    version: "qualification_dossier_v1",
    inquiryId: lead.id,
    canonicalLeadId: lead.duplicate_of_lead_id || lead.id,
    ownership: { kind: !owner.id ? "unassigned" : owner.inherited ? "inherited" : "direct", agentId: owner.id },
    intent, property, buyerInterest, timeframe,
    enteredFacts: {
      condition: entered(lead.condition, "condition", 500),
      financing: entered(lead.stated_financing, "stated_financing", 160),
      preapproval: typeof lead.stated_preapproval === "boolean" ? fact(lead.stated_preapproval, "stated_preapproval") : unknown(),
    },
    agency, jurisdiction, holds, questions, nextStep,
    limitations: [
      "Retained entries are client-reported or intake facts, not independently verified property, availability, ownership or agency evidence.",
      "Evidence capturedAt refers only to inquiry creation when retained; field-level capture and verification times are not recorded.",
      "Country, region and locality come only from normalized address_entry; county is not retained. Buyer interests never supply structured jurisdiction.",
      "No contact permission, consent, representation, assignment authority, routing readiness, score or suitability is established by this projection.",
      "A disclosure link, send, checkbox or signature is not proof of human agency review or representation. No supplemental facts store is assumed.",
    ],
  };
}
