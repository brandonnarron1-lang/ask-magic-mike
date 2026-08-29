import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../../src/lib/security/rate-limit";
import { isAutomatedBrowserUserAgent } from "../../../lib/browserAutomation";
import { readBoundedIngressJson } from "../../../lib/growth/ingress-http";
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

const MAX_EXPERIMENT_BODY_BYTES = 4_096;
const EXPERIMENT_KEY_PATTERN = /^[a-z][a-z0-9_]{2,80}$/;
const SUBJECT_KEY_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SURFACE_PATTERN = /^\/[a-z0-9/_-]{0,119}$/;

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
  const origin = request.headers.get("origin");
  if (!origin || !isApprovedPublicOrigin(origin)) {
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

  const parsed = await readBoundedIngressJson(request, {
    maxRequestBytes: MAX_EXPERIMENT_BODY_BYTES,
  });
  if (!parsed.ok) {
    return experimentResponse(
      { active: false, recorded: false, correlation_id: correlationId },
      parsed.status,
    );
  }

  const body = parsed.value as EventBody;
  if (
    typeof body.experiment_key !== "string" ||
    !EXPERIMENT_KEY_PATTERN.test(body.experiment_key) ||
    typeof body.subject_key !== "string" ||
    !SUBJECT_KEY_PATTERN.test(body.subject_key) ||
    typeof body.event_name !== "string"
  ) {
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
  if (
    (body.surface !== undefined && body.surface !== null &&
      (typeof body.surface !== "string" || !SURFACE_PATTERN.test(body.surface))) ||
    (body.event_name === "exposure" && body.lead_id !== undefined && body.lead_id !== null) ||
    (body.event_name === "lead_created" &&
      (typeof body.lead_id !== "string" || !UUID_PATTERN.test(body.lead_id)))
  ) {
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
    surface: typeof body.surface === "string" ? body.surface : null,
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
