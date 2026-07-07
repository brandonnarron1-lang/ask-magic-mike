import { NextResponse } from "next/server";
import { normalizeLeadPayload, type LeadPayload } from "../../lib/leadPayload";
import { PUBLIC_LEAD_SAVE_ERROR } from "../../lib/publicLeadErrors";

const LEAD_TYPES = new Set([
  "buyer",
  "seller",
  "seller_cash_offer",
  "investor",
  "listing_inquiry",
  "home_value",
  "relocation",
  "renter",
  "agent_referral",
  "general_question",
  "unknown",
]);

type SupabaseHeaders = Record<string, string>;

async function trackPosthog(event: string, properties: Record<string, unknown>) {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return;

  const host = process.env.POSTHOG_API_HOST || "https://app.posthog.com";

  try {
    await fetch(host + "/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties,
        distinct_id: properties.distinct_id || "anonymous",
      }),
    });
  } catch {
    // Analytics must never block lead capture.
  }
}

async function generateSummary(payload: LeadPayload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Mike Eatmon at Our Town Properties. Reply with one concise, practical sentence for a Wilson, NC real estate lead. Do not invent MLS data, pricing, or property facts.",
        },
        {
          role: "user",
          content: [
            "Funnel: " + payload.funnel_type,
            "Surface: " + payload.lead_source_surface,
            "Address: " + (payload.address || ""),
            "Name: " + (payload.name || ""),
            "Email: " + (payload.email || ""),
            "Phone: " + (payload.phone || ""),
            "Timeline: " + (payload.timeline || ""),
            "Condition: " + (payload.condition || ""),
            "Question: " + (payload.question || ""),
            "Notes: " + (payload.notes || ""),
          ].join("\n"),
        },
      ],
      max_tokens: 90,
      temperature: 0.35,
    }),
  });

  if (!res.ok) return undefined;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const summary = data.choices?.[0]?.message?.content;
  return typeof summary === "string" ? summary.trim() : undefined;
}

async function sendResendEmail(payload: LeadPayload, summary?: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const to = payload.email;
  if (!resendKey || !to) return;

  const subject =
    payload.funnel_type === "seller"
      ? "We received your property details"
      : "We received your home value request";
  const text =
    "Thanks for reaching out to Ask Magic Mike and Our Town Properties." +
    (summary ? "\n\n" + summary : "") +
    "\n\nCalendly: https://calendly.com/askmagicmike";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ask Magic Mike <mike@askmagicmike.com>",
      to,
      subject,
      text,
    }),
  });
}

function leadTypeFor(payload: LeadPayload) {
  if (payload.lead_type && LEAD_TYPES.has(payload.lead_type)) return payload.lead_type;
  if (payload.funnel_type === "seller") return "seller";
  if (payload.funnel_type === "home_value" || payload.funnel_type === "widget") return "home_value";
  return "general_question";
}

function primaryIntentFor(leadType: string, payload: LeadPayload) {
  if (
    leadType === "seller" ||
    leadType === "seller_cash_offer" ||
    leadType === "investor" ||
    leadType === "home_value" ||
    payload.funnel_type === "seller"
  ) {
    return "sell";
  }
  if (
    leadType === "buyer" ||
    leadType === "listing_inquiry" ||
    leadType === "relocation" ||
    leadType === "renter"
  ) {
    return "buy";
  }
  return "unknown";
}

function timelineMonthsFor(input?: string) {
  const value = (input || "").toLowerCase();
  if (!value) return 24;
  if (/\basap\b|immediate|as soon|right away|0\s*[-–]\s*30|under 30|this month/.test(value)) return 0;
  if (/30\s*[-–]\s*60|60\s*[-–]\s*90|31\s*[-–]\s*90|next 90|90 days/.test(value)) return 3;
  if (/3\s*[-–]\s*6|three\s*[-–]\s*six|3 to 6/.test(value)) return 6;
  if (/6\s*[-–]\s*12|six\s*[-–]\s*twelve|6 to 12/.test(value)) return 12;
  if (/12\+|12 plus|more than 12|next year|just planning|just curious|not sure|unknown/.test(value)) return 24;
  return 24;
}

function splitName(payload: LeadPayload) {
  const explicitFirst = payload.first_name;
  const explicitLast = payload.last_name;
  if (explicitFirst || explicitLast) {
    return { firstName: explicitFirst || null, lastName: explicitLast || null };
  }

  const name = payload.name?.trim();
  if (!name) return { firstName: null, lastName: null };
  const parts = name.split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function stripPhoneDigits(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits || null;
}

function isUuid(value?: string) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sessionIdFor(payload: LeadPayload): string {
  return isUuid(payload.widget_session_id) && payload.widget_session_id
    ? payload.widget_session_id
    : crypto.randomUUID();
}

function sourceFor(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  return attribution.source || (payload.lead_source_surface === "widget" ? "widget" : payload.lead_source_surface);
}

function sourceDetailFor(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  return [
    payload.lead_source_surface,
    attribution.medium,
    attribution.campaign,
    attribution.placement,
  ].filter(Boolean).join(" / ") || null;
}

function pageUrlFor(payload: LeadPayload, req: Request) {
  const attribution = payload.attribution || {};
  const referrer = req.headers.get("referer") || undefined;
  return (
    payload.page_url ||
    attribution.parent_url ||
    attribution.landing_page ||
    attribution.current_path ||
    referrer ||
    null
  );
}

function sessionLandingPageFor(payload: LeadPayload, req: Request) {
  const attribution = payload.attribution || {};
  return (
    attribution.parent_url ||
    payload.page_url ||
    attribution.landing_page ||
    attribution.current_path ||
    req.headers.get("referer") ||
    null
  );
}

function referrerTypeFor(payload: LeadPayload) {
  const source = (sourceFor(payload) || "").toLowerCase();
  const medium = (payload.attribution?.medium || "").toLowerCase();
  if (["cpc", "paid", "paid_social", "ppc"].includes(medium)) return "paid";
  if (["facebook", "instagram", "meta", "tiktok", "youtube"].includes(source)) return "social";
  if (medium === "email") return "email";
  if (payload.attribution?.referrer || payload.attribution?.parent_url) return "referral";
  return "direct";
}

function buildNotes(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  const notes = [
    payload.notes,
    payload.address ? "Address: " + payload.address : undefined,
    payload.question ? "Question: " + payload.question : undefined,
    payload.condition ? "Condition: " + payload.condition : undefined,
    payload.timeline ? "Timeline: " + payload.timeline : undefined,
    "Attribution: " + JSON.stringify(attribution),
  ]
    .filter(Boolean)
    .join("\n");

  return notes || null;
}

function buildSessionRow(payload: LeadPayload, req: Request, sessionId: string) {
  const attribution = payload.attribution || {};
  return {
    id: sessionId,
    utm_source: attribution.source || null,
    utm_medium: attribution.medium || null,
    utm_campaign: attribution.campaign || null,
    utm_content: attribution.content || null,
    utm_term: attribution.term || null,
    referrer_url: attribution.parent_url || attribution.referrer || req.headers.get("referer") || null,
    referrer_type: referrerTypeFor(payload),
    landing_page: sessionLandingPageFor(payload, req),
    user_agent: req.headers.get("user-agent") || null,
    device_type: attribution.device_category === "mobile" ||
      attribution.device_category === "tablet" ||
      attribution.device_category === "desktop"
      ? attribution.device_category
      : null,
    initial_question: payload.question || null,
    initial_address: payload.address || payload.property_address || null,
    status: "completed",
    step_reached: 5,
  };
}

function buildLeadRow(payload: LeadPayload, req: Request, sessionId: string) {
  const leadType = leadTypeFor(payload);
  const { firstName, lastName } = splitName(payload);
  const notes = buildNotes(payload);

  return {
    session_id: sessionId,
    first_name: firstName,
    last_name: lastName,
    email: payload.email || null,
    phone: payload.phone || null,
    phone_normalized: stripPhoneDigits(payload.phone),
    state: "NC",
    address_raw: payload.property_address || payload.address || null,
    primary_intent: primaryIntentFor(leadType, payload),
    question_raw: notes || payload.question || payload.condition || null,
    timeline_months: timelineMonthsFor(payload.timeline),
    consent_sms: false,
    consent_call: false,
    consent_email: false,
    consent_timestamp: new Date().toISOString(),
    consent_language_version: "canonical_v1",
    status: payload.status,
    lead_type: leadType,
    source: sourceFor(payload),
    source_detail: sourceDetailFor(payload),
    page_url: pageUrlFor(payload, req),
    widget_session_id: payload.widget_session_id || sessionId,
  };
}

function withoutUndefined(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

async function postgrestUpsert(
  url: string,
  headers: SupabaseHeaders,
  row: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(withoutUndefined(row)),
  });

  if (response.ok) return;

  const errorText = await response.text();
  console.error("LeadOps production write failed", {
    url: url.replace(/^https?:\/\/[^/]+/, "[supabase]"),
    status: response.status,
    status_text: response.statusText,
    error: errorText || response.statusText,
  });
  throw new Error("lead_insert_failed");
}

async function insertLead(payload: LeadPayload, req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.info("Lead capture no-op: missing Supabase env vars", {
      funnel_type: payload.funnel_type,
      lead_source_surface: payload.lead_source_surface,
      address: payload.address,
      email: payload.email,
      phone: payload.phone,
    });
    return;
  }

  const sessionId = sessionIdFor(payload);
  const headers = {
    apikey: supabaseServiceKey,
    Authorization: "Bearer " + supabaseServiceKey,
    "Content-Type": "application/json",
  };

  await postgrestUpsert(
    supabaseUrl + "/rest/v1/sessions?on_conflict=id",
    headers,
    buildSessionRow(payload, req, sessionId),
  );

  await postgrestUpsert(
    supabaseUrl + "/rest/v1/leads?on_conflict=session_id",
    headers,
    buildLeadRow(payload, req, sessionId),
  );
}

function validateLead(payload: LeadPayload) {
  if ((payload.funnel_type === "home_value" || payload.funnel_type === "widget") && !payload.address) {
    return "Address is required.";
  }

  if (
    (payload.funnel_type === "home_value" || payload.funnel_type === "widget") &&
    (!payload.email || !payload.phone)
  ) {
    return "Email and phone are required for a home value request.";
  }

  if (payload.funnel_type === "seller" && (!payload.address || !payload.phone)) {
    return "Property address and phone are required for seller requests.";
  }

  if (payload.funnel_type === "chat" && !payload.question) {
    return "Question is required for chat leads.";
  }

  if (payload.funnel_type === "appointment" && !payload.email && !payload.phone) {
    return "Email or phone is required to schedule an appointment.";
  }

  return null;
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const payload = normalizeLeadPayload(input);
  const validationError = validateLead(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    await insertLead(payload, req);
  } catch (error) {
    console.error("Lead persistence failed", {
      funnel_type: payload.funnel_type,
      lead_source_surface: payload.lead_source_surface,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: PUBLIC_LEAD_SAVE_ERROR },
      { status: 500 },
    );
  }

  const summary = await generateSummary(payload);
  await sendResendEmail(payload, summary);

  const eventProperties = {
    funnel_name: payload.funnel_type,
    lead_source_surface: payload.lead_source_surface,
    step_name: payload.funnel_type === "seller" ? "seller_intent" : "lead_submit",
    distinct_id: payload.email || payload.phone || "anonymous",
    address: payload.address,
    email: payload.email,
    phone: payload.phone,
    timeline: payload.timeline,
    ...payload.attribution,
  };

  await trackPosthog("lead_created", eventProperties);

  return NextResponse.json({
    message: summary ? "Got it. " + summary : "Got it. Mike will follow up shortly.",
  });
}
