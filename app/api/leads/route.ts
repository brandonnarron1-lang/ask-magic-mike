import { NextResponse } from "next/server";
import { normalizeLeadPayload, type LeadPayload } from "../../lib/leadPayload";

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

function buildLeadRows(payload: LeadPayload) {
  const attribution = payload.attribution || {};
  const notes = [
    payload.notes,
    payload.question ? "Question: " + payload.question : undefined,
    payload.condition ? "Condition: " + payload.condition : undefined,
    payload.timeline ? "Timeline: " + payload.timeline : undefined,
    "Attribution: " + JSON.stringify(attribution),
  ]
    .filter(Boolean)
    .join("\n");

  const fullRow = {
    funnel_type: payload.funnel_type,
    lead_source_surface: payload.lead_source_surface,
    address: payload.address,
    property_address: payload.property_address || payload.address,
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    timeline: payload.timeline,
    property_condition: payload.condition,
    notes,
    question: payload.question,
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    content: attribution.content,
    term: attribution.term,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    initial_path: attribution.initial_path,
    current_path: attribution.current_path,
    parent_url: attribution.parent_url,
    embed_host: attribution.embed_host,
    placement: attribution.placement,
    gclid: attribution.gclid,
    fbclid: attribution.fbclid,
    device_category: attribution.device_category,
    status: payload.status,
    assigned_agent_id: payload.assigned_agent_id,
    created_at: payload.created_at || new Date().toISOString(),
  };

  const legacyRow = {
    address: payload.address,
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    notes,
  };

  return { fullRow, legacyRow };
}

async function insertLead(payload: LeadPayload) {
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

  const { fullRow, legacyRow } = buildLeadRows(payload);
  const headers = {
    apikey: supabaseServiceKey,
    Authorization: "Bearer " + supabaseServiceKey,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  const insertFull = await fetch(supabaseUrl + "/rest/v1/leads", {
    method: "POST",
    headers,
    body: JSON.stringify(fullRow),
  });

  if (insertFull.ok) return;

  const insertLegacy = await fetch(supabaseUrl + "/rest/v1/leads", {
    method: "POST",
    headers,
    body: JSON.stringify(legacyRow),
  });

  if (!insertLegacy.ok) {
    const errText = await insertLegacy.text();
    throw new Error("Supabase insert failed: " + (errText || insertLegacy.statusText));
  }
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
    await insertLead(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead insert failed." },
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
