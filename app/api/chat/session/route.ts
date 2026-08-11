import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../../src/lib/security/rate-limit";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";

export async function POST(req: Request) {
  if (!isApprovedPublicOrigin(req.headers.get("origin"))) return NextResponse.json({ error: "This origin is not approved." }, { status: 403 });
  const limit = await checkRateLimit(rateLimitKey(req.headers.get("x-forwarded-for")), LIMITS.sessionCreate.limit, LIMITS.sessionCreate.windowMs, "sessionCreate");
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  return NextResponse.json({ session_id: crypto.randomUUID() });
}
