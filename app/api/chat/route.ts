import { NextResponse } from "next/server";

function clean(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

const fallback =
  "I can help you think through that. For address-specific guidance, send the property address and the best way for Mike to follow up. I will not invent MLS facts or pricing without a real review.";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const message = clean(input.message);
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: fallback });
  }

  try {
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
              "You are Ask Magic Mike, a careful local real estate advisor interface for Mike Eatmon and Our Town Properties in Wilson, NC. Give concise, practical guidance. Never invent MLS facts, active listings, prices, comps, tax details, or neighborhood claims. For property-specific advice, ask for an address and contact path for follow-up.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 180,
        temperature: 0.45,
      }),
    });

    if (!res.ok) return NextResponse.json({ message: fallback });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ message: answer || fallback });
  } catch {
    return NextResponse.json({ message: fallback });
  }
}
