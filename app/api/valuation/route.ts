import { NextResponse } from "next/server";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_page?: string;
  initial_path?: string;
  current_path?: string;
  gclid?: string;
  fbclid?: string;
  created_at?: string;
};

type LeadPayload = {
  funnel_type?: "home_value" | "seller" | "chat" | "appointment";
  address?: string;
  property_address?: string;
  email?: string;
  name?: string;
  phone?: string;
  timeline?: string;
  condition?: string;
  notes?: string;
  status?: "new";
  assigned_agent_id?: string | null;
  attribution?: Attribution;
};

function clean(input: unknown) {
  const value = typeof input === "string" ? input.trim() : "";
  return value ? value : undefined;
}

function cleanAttribution(input: unknown): Attribution {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    source: clean(raw.source),
    medium: clean(raw.medium),
    campaign: clean(raw.campaign),
    content: clean(raw.content),
    term: clean(raw.term),
    referrer: clean(raw.referrer),
    landing_page: clean(raw.landing_page),
    initial_path: clean(raw.initial_path),
    current_path: clean(raw.current_path),
    gclid: clean(raw.gclid),
    fbclid: clean(raw.fbclid),
    created_at: clean(raw.created_at),
  };
}

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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Mike Eatmon at Our Town Properties. Reply with one concise, practical sentence for a Wilson, NC real estate lead.",
        },
        {
          role: "user",
          content: [
            "Funnel: " + (payload.funnel_type || "home_value"),
            "Address: " + (payload.address || ""),
            "Name: " + (payload.name || ""),
            "Email: " + (payload.email || ""),
            "Phone: " + (payload.phone || ""),
            "Timeline: " + (payload.timeline || ""),
            "Condition: " + (payload.condition || ""),
            "Notes: " + (payload.notes || ""),
          ].join("\n"),
        },
      ],
      max_tokens: 80,
      temperature: 0.4,
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
  const to = clean(payload.email);
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
    payload.condition ? "Condition: " + payload.condition : undefined,
    payload.timeline ? "Timeline: " + payload.timeline : undefined,
    "Attribution: " + JSON.stringify(attribution),
  ]
    .filter(Boolean)
    .join("\n");

  const fullRow = {
    funnel_type: payload.funnel_type || "home_value",
    address: payload.address,
    property_address: payload.property_address || payload.address,
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    timeline: payload.timeline,
    property_condition: payload.condition,
    notes,
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    content: attribution.content,
    term: attribution.term,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    initial_path: attribution.initial_path,
    current_path: attribution.current_path,
    gclid: attribution.gclid,
    fbclid: attribution.fbclid,
    status: payload.status || "new",
    assigned_agent_id: payload.assigned_agent_id || null,
    created_at: new Date().toISOString(),
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
    // TODO: Replace this no-op with the production data adapter when database
    // credentials are available in every environment.
    console.info("Lead capture no-op: missing Supabase env vars", {
      funnel_type: payload.funnel_type,
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

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const payload: LeadPayload = {
    funnel_type:
      input.funnel_type === "seller" ||
      input.funnel_type === "chat" ||
      input.funnel_type === "appointment"
        ? input.funnel_type
        : "home_value",
    address: clean(input.address || input.property_address),
    property_address: clean(input.property_address || input.address),
    email: clean(input.email),
    name: clean(input.name),
    phone: clean(input.phone),
    timeline: clean(input.timeline),
    condition: clean(input.condition),
    notes: clean(input.notes),
    status: "new",
    assigned_agent_id: null,
    attribution: cleanAttribution(input.attribution),
  };

  if (!payload.address || payload.address.length < 4) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  if (payload.funnel_type === "home_value" && (!payload.email || !payload.phone)) {
    return NextResponse.json(
      { error: "Email and phone are required for a home value request." },
      { status: 400 },
    );
  }

  if (payload.funnel_type === "seller" && !payload.phone) {
    return NextResponse.json(
      { error: "Phone is required for seller requests." },
      { status: 400 },
    );
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
