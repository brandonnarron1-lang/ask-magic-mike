import { NextRequest, NextResponse } from "next/server";
import { CreateLeadCanonicalSchema } from "@/schemas/leads-canonical.schema";
import { LeadCaptureEngine, type LeadCaptureRepository } from "@/lib/engines/lead-capture";
import { createSupabaseLeadCaptureRepo } from "@/lib/engines/lead-capture-supabase-repo";
import {
  defaultLeadRateLimiter,
  bucketKey,
} from "@/lib/compliance/rate-limit";
import { isSupabaseConfigured, isProduction } from "@/lib/db/types";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Canonical public lead capture.
 *
 * Accepts payloads from every source — Ask Magic Mike landing,
 * We Buy Houses, widget, listing pages, manual admin, ad-form webhooks.
 * Stays small and responds in mock mode when Supabase isn't configured.
 */
export async function POST(req: NextRequest) {
  // 1) Rate limit (IP-bucketed). Skip in dev/tests for ergonomics.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isProduction()) {
    const rl = defaultLeadRateLimiter.check(bucketKey(ip, "/api/leads"));
    if (!rl.allowed) {
      trackEventNoWait({
        eventName: "rate_limited",
        properties: { route: "/api/leads", ip },
      });
      return NextResponse.json(
        { error: "rate_limited", message: "Slow down. Try again shortly." },
        {
          status: 429,
          headers: {
            ...NO_STORE,
            "Retry-After": Math.ceil((rl.resetAtMs - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // 2) Parse + validate.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = CreateLeadCanonicalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.flatten() },
      { status: 422, headers: NO_STORE }
    );
  }

  // 3) Capture. Pick repo based on env.
  const repo: LeadCaptureRepository = isSupabaseConfigured()
    ? createSupabaseLeadCaptureRepo()
    : createInMemoryRepo();

  const engine = new LeadCaptureEngine(repo);

  try {
    const result = await engine.capture(parsed.data, {
      ipAddress: ip === "unknown" ? null : ip,
      userAgent: req.headers.get("user-agent"),
      referrer:  req.headers.get("referer"),
      acceptedLanguage: req.headers.get("accept-language"),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          ...result.publicPayload,
        },
        { status: 422, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        ...result.publicPayload,
        lead_grade: result.grade,
        is_duplicate: result.isDuplicate,
      },
      { status: result.isDuplicate ? 200 : 201, headers: NO_STORE }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/leads] capture error:", msg);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500, headers: NO_STORE }
    );
  }
}

/**
 * Dev/mock repo: returns a synthetic id and never persists. Used when
 * Supabase isn't configured (local dev without `.env.local` keys).
 */
function createInMemoryRepo(): LeadCaptureRepository {
  return {
    async findKnownByIdentity() {
      return [];
    },
    async insertLead(rec) {
      return rec.id;
    },
    async recordDuplicateAttempt() {
      // no-op
    },
  };
}
