import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../../src/lib/security/rate-limit";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";
import { recordPublicExperimentEvent } from "../../../lib/persistence/neonPublicExperimentRepository";

type EventBody = {
  experiment_key?: unknown;
  subject_key?: unknown;
  event_name?: unknown;
  lead_id?: unknown;
  surface?: unknown;
};

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  if (!isApprovedPublicOrigin(request.headers.get("origin"))) {
    return NextResponse.json(
      { active: false, recorded: false, correlation_id: correlationId },
      { status: 403 },
    );
  }
  const limit = await checkRateLimit(
    rateLimitKey(request.headers.get("x-forwarded-for")),
    LIMITS.analyticsEvent.limit,
    LIMITS.analyticsEvent.windowMs,
    "analyticsEvent",
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { active: false, recorded: false, correlation_id: correlationId },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null) as EventBody | null;
  if (!body || typeof body.experiment_key !== "string" ||
    typeof body.subject_key !== "string" || typeof body.event_name !== "string") {
    return NextResponse.json(
      { active: false, recorded: false, correlation_id: correlationId },
      { status: 400 },
    );
  }
  if (body.event_name !== "exposure" && body.event_name !== "lead_created") {
    return NextResponse.json(
      { active: false, recorded: false, correlation_id: correlationId },
      { status: 400 },
    );
  }

  const outcome = await recordPublicExperimentEvent({
    experimentKey: body.experiment_key,
    subjectKey: body.subject_key,
    eventName: body.event_name,
    leadId: typeof body.lead_id === "string" ? body.lead_id : null,
    surface: typeof body.surface === "string" ? body.surface.slice(0, 120) : null,
  });
  return NextResponse.json(
    {
      active: outcome.active,
      recorded: outcome.recorded,
      variant_key: outcome.variantKey,
      correlation_id: correlationId,
    },
    { status: 202 },
  );
}
