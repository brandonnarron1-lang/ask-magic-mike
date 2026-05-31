import type { DbLead, AdminLeadRow, FactorLogEntry } from "./types";
import { isDev } from "./types";
import type { Temperature } from "@/types/domain.types";
import { stripToDigits } from "@/lib/utils/phone";

export interface UpsertLeadInput {
  sessionId: string;
  contactId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  addressRaw?: string | null;
  primaryIntent: string;
  questionRaw?: string | null;
  timelineMonths?: number | null;
  consentSms?: boolean;
  consentCall?: boolean;
  consentEmail?: boolean;
  consentTimestamp?: string | null;
  consentIp?: string | null;
  ctaChipUsed?: string | null;
  status?: string;
}

export async function upsertLead(input: UpsertLeadInput): Promise<DbLead | null> {
  if (isDev()) return null;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data, error } = await client
    .from("leads")
    .upsert(
      {
        session_id:        input.sessionId,
        contact_id:        input.contactId,
        first_name:        input.firstName,
        last_name:         input.lastName,
        email:             input.email,
        phone:             input.phone,
        phone_normalized:  input.phone ? stripToDigits(input.phone) : null,
        address_line1:     input.addressLine1,
        address_line2:     input.addressLine2,
        city:              input.city,
        state:             input.state ?? "NC",
        zip:               input.zip,
        address_raw:       input.addressRaw,
        primary_intent:    input.primaryIntent,
        question_raw:      input.questionRaw,
        timeline_months:   input.timelineMonths,
        consent_sms:       input.consentSms ?? false,
        consent_call:      input.consentCall ?? false,
        consent_email:     input.consentEmail ?? false,
        consent_timestamp: input.consentTimestamp,
        consent_ip:        input.consentIp,
        cta_chip_used:     input.ctaChipUsed,
        status:            input.status ?? "scored",
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id, contact_id, created_at, first_name, last_name, email, phone, address_line1, city, state, zip, address_raw, primary_intent, question_raw, timeline_months, consent_sms, consent_call, consent_email, consent_timestamp, cta_chip_used, status, crm_contact_id, crm_synced_at")
    .single();

  if (error) {
    console.error("[lead-repository] upsertLead error:", error.message);
    return null;
  }
  return mapLead(data);
}

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  if (isDev()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient()
    .from("leads")
    .update({ status })
    .eq("id", leadId);
}

export async function updateLeadCRM(leadId: string, crmContactId: string): Promise<void> {
  if (isDev()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient()
    .from("leads")
    .update({ crm_contact_id: crmContactId, crm_synced_at: new Date().toISOString() })
    .eq("id", leadId);
}

export async function getLeadsForAdmin(limit = 100): Promise<AdminLeadRow[]> {
  if (isDev()) return DEV_LEADS;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data } = await client
    .from("leads")
    .select(`
      id, first_name, last_name, email, phone,
      primary_intent, question_raw, address_raw, status, created_at,
      consent_sms, consent_call, consent_email,
      lead_scores ( seller_certainty_score, buyer_certainty_score, composite_score, temperature, factor_log ),
      lead_routing ( status, accept_deadline, contact_deadline, agents ( name ) ),
      sessions ( utm_source, utm_campaign )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return DEV_LEADS;

  return data.map((row) => {
    const score   = Array.isArray(row.lead_scores)  ? row.lead_scores[0]  : row.lead_scores;
    const routing = Array.isArray(row.lead_routing) ? row.lead_routing[0] : row.lead_routing;
    const session = Array.isArray(row.sessions)     ? row.sessions[0]     : row.sessions;
    const agent   = routing && !Array.isArray((routing as { agents?: unknown }).agents)
      ? (routing as { agents?: { name?: string } }).agents
      : null;

    const contactDl = routing
      ? new Date((routing as { contact_deadline?: string }).contact_deadline ?? "")
      : null;
    const slaBreached = contactDl instanceof Date && !isNaN(contactDl.getTime())
      ? contactDl < new Date()
      : false;

    return {
      id:            row.id,
      name:          [row.first_name, row.last_name].filter(Boolean).join(" ") || "Anonymous",
      email:         row.email ?? null,
      phone:         row.phone ?? null,
      intent:        row.primary_intent ?? "unknown",
      question:      row.question_raw ?? null,
      addressRaw:    row.address_raw ?? null,
      temperature:   ((score as { temperature?: string } | null)?.temperature ?? "low") as Temperature,
      sellerScore:   (score as { seller_certainty_score?: number } | null)?.seller_certainty_score ?? 0,
      buyerScore:    (score as { buyer_certainty_score?: number } | null)?.buyer_certainty_score ?? 0,
      compositeScore:(score as { composite_score?: number } | null)?.composite_score ?? 0,
      factorLog:     ((score as { factor_log?: unknown } | null)?.factor_log ?? []) as FactorLogEntry[],
      agentName:     (agent as { name?: string } | null)?.name ?? "Unassigned",
      status:        row.status ?? "new",
      createdAt:     row.created_at,
      slaBreached,
      utmSource:     (session as { utm_source?: string | null } | null)?.utm_source ?? null,
      utmCampaign:   (session as { utm_campaign?: string | null } | null)?.utm_campaign ?? null,
      consentSms:    row.consent_sms ?? false,
      consentCall:   row.consent_call ?? false,
      consentEmail:  row.consent_email ?? false,
    };
  });
}

function mapLead(row: Record<string, unknown>): DbLead {
  return {
    id:               row.id as string,
    sessionId:        row.session_id as string,
    contactId:        (row.contact_id as string | null) ?? null,
    createdAt:        row.created_at as string,
    firstName:        (row.first_name as string | null) ?? null,
    lastName:         (row.last_name as string | null) ?? null,
    email:            (row.email as string | null) ?? null,
    phone:            (row.phone as string | null) ?? null,
    addressLine1:     (row.address_line1 as string | null) ?? null,
    city:             (row.city as string | null) ?? null,
    state:            (row.state as string | null) ?? null,
    zip:              (row.zip as string | null) ?? null,
    addressRaw:       (row.address_raw as string | null) ?? null,
    primaryIntent:    row.primary_intent as string,
    questionRaw:      (row.question_raw as string | null) ?? null,
    timelineMonths:   (row.timeline_months as number | null) ?? null,
    consentSms:       (row.consent_sms as boolean) ?? false,
    consentCall:      (row.consent_call as boolean) ?? false,
    consentEmail:     (row.consent_email as boolean) ?? false,
    consentTimestamp: (row.consent_timestamp as string | null) ?? null,
    ctaChipUsed:      (row.cta_chip_used as string | null) ?? null,
    status:           row.status as string,
    crmContactId:     (row.crm_contact_id as string | null) ?? null,
    crmSyncedAt:      (row.crm_synced_at as string | null) ?? null,
  };
}

// ─── Dev fallback data ────────────────────────────────────────────────────────
const DEV_LEADS: AdminLeadRow[] = [
  {
    id: "dev-1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+12525550101",
    intent: "sell",
    question: "What is my home worth? I have a 3BR on Forest Hills Dr and want to list in the spring.",
    addressRaw: "123 Forest Hills Dr, Wilson NC 27896",
    temperature: "urgent",
    sellerScore: 85,
    buyerScore: 10,
    compositeScore: 85,
    factorLog: [
      { key: "intent_sell", points: 30, label: "Explicit sell intent", side: "seller" },
      { key: "cta_home_worth", points: 20, label: "Clicked 'What's my home worth?'", side: "seller" },
      { key: "timeline_asap", points: 20, label: "Timeline: ASAP", side: "seller" },
      { key: "has_address", points: 5, label: "Provided property address", side: "seller" },
      { key: "has_phone", points: 10, label: "Provided phone number", side: "shared" },
    ],
    agentName: "Mike Eatmon",
    status: "assigned",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    slaBreached: false,
    utmSource: "google",
    utmCampaign: "spring-sellers",
    consentSms: true,
    consentCall: true,
    consentEmail: false,
  },
  {
    id: "dev-2",
    name: "David & Kim Park",
    email: "dpark@example.com",
    phone: "+12525550102",
    intent: "buy",
    question: "Looking to buy a 4BR in Wilson under $350k. What's available near good schools?",
    addressRaw: null,
    temperature: "hot",
    sellerScore: 5,
    buyerScore: 72,
    compositeScore: 72,
    factorLog: [
      { key: "intent_buy", points: 30, label: "Explicit buy intent", side: "buyer" },
      { key: "cta_tour_home", points: 20, label: "Clicked 'Can I tour a home?'", side: "buyer" },
      { key: "timeline_3mo", points: 15, label: "Timeline: 3 months", side: "buyer" },
      { key: "has_email", points: 5, label: "Provided email", side: "shared" },
      { key: "has_phone", points: 10, label: "Provided phone number", side: "shared" },
    ],
    agentName: "Mike Eatmon",
    status: "assigned",
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    slaBreached: false,
    utmSource: null,
    utmCampaign: null,
    consentSms: true,
    consentCall: false,
    consentEmail: true,
  },
  {
    id: "dev-3",
    name: "Marcus Williams",
    email: null,
    phone: "+12525550103",
    intent: "sell",
    question: "Should I sell now or wait until fall? Inherited property on Nash St.",
    addressRaw: "Nash St NW, Wilson NC 27896",
    temperature: "warm",
    sellerScore: 55,
    buyerScore: 0,
    compositeScore: 55,
    factorLog: [
      { key: "intent_sell", points: 30, label: "Explicit sell intent", side: "seller" },
      { key: "cta_sell_now", points: 25, label: "Clicked 'Should I sell now?'", side: "seller" },
      { key: "has_phone", points: 10, label: "Provided phone number", side: "shared" },
    ],
    agentName: "Mike Eatmon",
    status: "scored",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    slaBreached: true,
    utmSource: "facebook",
    utmCampaign: null,
    consentSms: true,
    consentCall: false,
    consentEmail: false,
  },
  {
    id: "dev-4",
    name: "Anonymous",
    email: null,
    phone: null,
    intent: "unknown",
    question: "Just exploring. What are homes selling for in Rocky Mount these days?",
    addressRaw: null,
    temperature: "nurture",
    sellerScore: 10,
    buyerScore: 15,
    compositeScore: 15,
    factorLog: [],
    agentName: "Unassigned",
    status: "scored",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    slaBreached: false,
    utmSource: null,
    utmCampaign: null,
    consentSms: false,
    consentCall: false,
    consentEmail: false,
  },
];
