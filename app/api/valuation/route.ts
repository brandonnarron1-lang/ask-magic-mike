import { NextResponse } from "next/server";

type LeadPayload = {
  address: string;
  email?: string;
  name?: string;
  phone?: string;
  notes?: string;
};

function clean(input: string | null | undefined) {
  const v = (input ?? "").trim();
  return v ? v : undefined;
}

async function trackPosthog(event: string, properties: Record<string, any>) {
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
        distinct_id: properties?.distinct_id || "anonymous",
      }),
    });
  } catch (_) {
    // ignore analytics errors
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
          content: "You are Magic Mike. Reply with one friendly sentence." ,
        },
        {
          role: "user",
          content:
            "Address: " + payload.address +
            ". Name: " + (payload.name || "") +
            ". Email: " + (payload.email || "") +
            ". Phone: " + (payload.phone || "") +
            ". Notes: " + (payload.notes || ""),
        },
      ],
      max_tokens: 80,
      temperature: 0.6,
    }),
  });

  const data = await res.json();
  const summary = data?.choices?.[0]?.message?.content;
  if (!summary || typeof summary !== "string") return undefined;
  return summary.trim();
}

async function sendResendEmail(payload: LeadPayload, summary?: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const to = clean(payload.email);
  if (!resendKey || !to) return;

  const subject = "Thanks for reaching out";
  const text =
    "Got your address and we’ll prep a valuation." +
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

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase env vars." }, { status: 500 });
  }

  let payload: LeadPayload;
  try {
    payload = await req.json();
  } catch (_) {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  payload = {
    address: payload.address,
    email: clean(payload.email),
    name: clean(payload.name),
    phone: clean(payload.phone),
    notes: clean(payload.notes),
  };

  if (!payload.address || payload.address.trim().length < 4) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  // Insert into Supabase (REST)
  const insert = await fetch(supabaseUrl + "/rest/v1/leads", {
    method: "POST",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: "Bearer " + supabaseServiceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      address: payload.address,
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      notes: payload.notes,
    }),
  });

  if (!insert.ok) {
    const errText = await insert.text();
    return NextResponse.json(
      { error: "Supabase insert failed: " + (errText || insert.statusText) },
      { status: insert.status }
    );
  }

  const summary = await generateSummary(payload);

  await sendResendEmail(payload, summary);

  await trackPosthog("lead_submitted", {
    address: payload.address,
    email: payload.email,
    distinct_id: payload.email || payload.phone || "anonymous",
  });

  return NextResponse.json({
    message: summary ? "Got it. " + summary : "Got it. We’ll be in touch shortly.",
  });
}
