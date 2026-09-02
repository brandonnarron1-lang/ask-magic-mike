import { NextResponse } from "next/server";
import { assertDatabaseMutationAllowed } from "../../../../src/lib/preview-security";
import {
  checkRateLimit,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
  rateLimitKey,
} from "../../../../src/lib/security/rate-limit";
import { isAutomatedBrowserUserAgent } from "../../../lib/browserAutomation";
import { getPublicExperimentDefinition } from "../../../lib/growth/experiment-registry";
import { readBoundedIngressJson } from "../../../lib/growth/ingress-http";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";
import { recordPublicExperimentEvent } from "../../../lib/persistence/neonPublicExperimentRepository";

type EventBody = {
  experiment_key?: unknown;
  subject_key?: unknown;
  event_name?: unknown;
  surface?: unknown;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

const MAX_EXPERIMENT_BODY_BYTES = 4_096;
const EXPERIMENT_KEY_PATTERN = /^[a-z][a-z0-9_]{2,80}$/;
const SUBJECT_KEY_PATTERN = /^[a-f0-9]{64}$/;
const PUBLIC_EXPERIMENT_FIELDS = new Set([
  "experiment_key",
  "subject_key",
  "event_name",
  "surface",
]);

function experimentResponse(
  correlationId: string,
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { ...body, correlation_id: correlationId },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        "X-AMM-Correlation-Id": correlationId,
        ...extraHeaders,
      },
    },
  );
}

function rateLimitRetryAfter(resetAt: number) {
  const maxSeconds = Math.ceil(LIMITS.analyticsEvent.windowMs / 1_000);
  const secondsUntilReset = Math.ceil((resetAt - Date.now()) / 1_000);
  return String(Math.max(
    1,
    Math.min(maxSeconds, Number.isFinite(secondsUntilReset) ? secondsUntilReset : maxSeconds),
  ));
}

function invalidExperimentRequest(correlationId: string, code: string) {
  return experimentResponse(
    correlationId,
    {
      active: false,
      recorded: false,
      error: "Invalid experiment event.",
      code,
    },
    400,
  );
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const origin = request.headers.get("origin");
  if (!origin || !isApprovedPublicOrigin(origin)) {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: "This experiment origin is not approved.",
        code: "origin_not_approved",
      },
      403,
    );
  }
  if (isAutomatedBrowserUserAgent(request.headers.get("user-agent"))) {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        excluded: "automation",
      },
      202,
    );
  }

  // Read-only Preview must refuse before the limiter can write a durable
  // bucket or the experiment repository can mutate the canonical ledger.
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: mutation.publicMessage,
        code: mutation.error,
      },
      mutation.statusCode,
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
      correlationId,
      {
        active: false,
        recorded: false,
        error: "Too many experiment events. Please wait and try again.",
        code: "rate_limited",
      },
      429,
      { "Retry-After": rateLimitRetryAfter(limit.resetAt) },
    );
  }
  if (!limit.durable && !nonDurableRateLimitFallbackAllowed()) {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: "Experiment measurement is temporarily unavailable.",
        code: "rate_limit_store_unavailable",
      },
      503,
    );
  }

  let parsed: Awaited<ReturnType<typeof readBoundedIngressJson>>;
  try {
    parsed = await readBoundedIngressJson(request, {
      maxRequestBytes: MAX_EXPERIMENT_BODY_BYTES,
    });
  } catch {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: "Invalid experiment event.",
        code: "invalid_request",
      },
      400,
    );
  }
  if (!parsed.ok) {
    const code = parsed.status === 413
      ? "payload_too_large"
      : parsed.status === 415
        ? "unsupported_media_type"
        : "invalid_request";
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: parsed.status === 413
          ? "Experiment payload is too large."
          : "Invalid experiment event.",
        code,
      },
      parsed.status,
    );
  }

  const body = parsed.value as EventBody;
  // Durable conversions are server-authored after canonical lead storage.
  // A public caller may request an exposure only; it cannot attach an
  // arbitrary existing lead UUID to an experiment subject.
  if (body.event_name === "lead_created") {
    return invalidExperimentRequest(correlationId, "server_event_required");
  }
  if (Object.keys(body).some((field) => !PUBLIC_EXPERIMENT_FIELDS.has(field))) {
    return invalidExperimentRequest(correlationId, "unexpected_field");
  }
  if (
    typeof body.experiment_key !== "string" ||
    !EXPERIMENT_KEY_PATTERN.test(body.experiment_key) ||
    typeof body.subject_key !== "string" ||
    !SUBJECT_KEY_PATTERN.test(body.subject_key) ||
    body.event_name !== "exposure" ||
    typeof body.surface !== "string"
  ) {
    return invalidExperimentRequest(correlationId, "invalid_experiment_event");
  }
  const definition = getPublicExperimentDefinition(body.experiment_key);
  if (!definition || body.surface !== definition.surface) {
    return invalidExperimentRequest(correlationId, "invalid_experiment_context");
  }

  let outcome: Awaited<ReturnType<typeof recordPublicExperimentEvent>>;
  try {
    outcome = await recordPublicExperimentEvent({
      experimentKey: definition.key,
      subjectKey: body.subject_key,
      eventName: "exposure",
      surface: definition.surface,
    });
  } catch {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: "Experiment measurement is temporarily unavailable.",
        code: "experiment_store_unavailable",
      },
      503,
    );
  }
  if (outcome.reason === "unavailable") {
    return experimentResponse(
      correlationId,
      {
        active: false,
        recorded: false,
        error: "Experiment measurement is temporarily unavailable.",
        code: "experiment_store_unavailable",
      },
      503,
    );
  }
  if (outcome.reason === "invalid_input") {
    return invalidExperimentRequest(correlationId, "invalid_experiment_event");
  }

  return experimentResponse(
    correlationId,
    {
      active: outcome.active,
      recorded: outcome.recorded,
      variant_key: outcome.variantKey,
    },
    202,
  );
}
