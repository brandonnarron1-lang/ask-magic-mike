import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/analytics.schema";
import { trackEvent } from "@/lib/analytics/ledger";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TrackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await trackEvent({
    ...parsed.data,
    ipAddress: ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
