import { NextResponse } from "next/server";
import { isApprovedPublicOrigin } from "../../lib/publicOrigin";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../src/lib/security/rate-limit";

function clean(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

const fallback =
  "I can help you think through that. For address-specific guidance, send the property address and the best way for Mike to follow up. I will not invent MLS facts or pricing without a real review.";

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const headers = { "Cache-Control": "no-store" };
  const respond = (body: Record<string, unknown>, status = 200) =>
    NextResponse.json({ ...body, correlation_id: correlationId }, { status, headers });

  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return respond({ error: "This chat origin is not approved." }, 403);
  }
  const declaredSize = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(declaredSize) && declaredSize > 8_192) {
    return respond({ error: "Message is too large." }, 413);
  }
  const limit = await checkRateLimit(
    rateLimitKey(req.headers.get("x-forwarded-for")),
    LIMITS.chatMessage.limit,
    LIMITS.chatMessage.windowMs,
    "chatMessage",
  );
  if (!limit.allowed) {
    return respond({ error: "Too many chat requests. Please wait and try again." }, 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return respond({ error: "Invalid JSON." }, 400);
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const message = clean(input.message);
  if (!message) {
    return respond({ error: "Message is required." }, 400);
  }
  if (message.length > 2_000) {
    return respond({ error: "Message must be 2,000 characters or fewer." }, 413);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return respond({ message: fallback });
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
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return respond({ message: fallback });

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    return respond({ message: answer || fallback });
  } catch {
    return respond({ message: fallback });
  }
}
