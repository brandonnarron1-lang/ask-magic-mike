import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../../src/lib/security/rate-limit";
import { isAutomatedBrowserUserAgent } from "../../../lib/browserAutomation";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";
import { recordPublicExperimentEvent } from "../../../lib/persistence/neonPublicExperimentRepository";

type EventBody = {
  experiment_key?: unknown;
  subject_key?: unknown;
  event_name?: unknown;
  lead_id?: unknown;
  surface?: unknown;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

function experimentResponse(
  body: {
    active: boolean;
    recorded: boolean;
    correlation_id: string;
    variant_key?: string | null;
    excluded?: "automation";
  },
  status: number,
) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  if (!isApprovedPublicOrigin(request.headers.get("origin"))) {
    return experimentResponse(
      { active: false, recorded: false, correlation_id: correlationId },
      403,
    );
  }
  if (isAutomatedBrowserUserAgent(request.headers.get("user-agent"))) {
    return experimentResponse(
      {
        active: false,
        recorded: false,
        excluded: "automation",
        correlation_id: correlationId,
      },
      202,
    );
  }
  const limit = await checkRateLimit(
    rateLimitKey(request.headers.get("x-forwarded-for")),
    LIMITS.analyticsEvent.limit,
    LIMITS.analyticsEvent.windowMs,
    "analyticsEvent",
  );
  if (!limit.allowed) {
    return experimentResponse(
      { active: false, recorded: false, correlation_id: correlationId },
      429,
    );
  }

  const body = await request.json().catch(() => null) as EventBody | null;
  if (!body || typeof body.experiment_key !== "string" ||
    typeof body.subject_key !== "string" || typeof body.event_name !== "string") {
    return experimentResponse(
      { active: false, recorded: false, correlation_id: correlationId },
      400,
    );
  }
  if (body.event_name !== "exposure" && body.event_name !== "lead_created") {
    return experimentResponse(
      { active: false, recorded: false, correlation_id: correlationId },
      400,
    );
  }

  const outcome = await recordPublicExperimentEvent({
    experimentKey: body.experiment_key,
    subjectKey: body.subject_key,
    eventName: body.event_name,
    leadId: typeof body.lead_id === "string" ? body.lead_id : null,
    surface: typeof body.surface === "string" ? body.surface.slice(0, 120) : null,
  });
  return experimentResponse(
    {
      active: outcome.active,
      recorded: outcome.recorded,
      variant_key: outcome.variantKey,
      correlation_id: correlationId,
    },
    202,
  );
}
