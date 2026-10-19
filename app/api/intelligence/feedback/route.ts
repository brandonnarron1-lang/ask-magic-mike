import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ingressSameOrigin, privateIngressResponse, readBoundedIngressJson } from "../../../lib/growth/ingress-http";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { feedbackSubmissionSchema, readOwnAnswerFeedback, submitAnswerFeedback } from "@/lib/intelligence/feedback";
import { readR2Viewer, r2Query } from "@/lib/intelligence/viewer";

export const dynamic = "force-dynamic";
const respond = (body: unknown, status = 200) => privateIngressResponse(NextResponse.json(body, { status }));
const querySchema = z.object({ answerId: z.string().uuid(), revision: z.coerce.number().int().positive() }).strict();

/** Read-only acknowledgment; never creates a guest session, report, job or audit. */
export async function GET(request: NextRequest) {
  if (process.env.R2_SOURCE_GOVERNANCE_ENABLED !== "true") return respond({ ok: false, error: "feedback_disabled" }, 404);
  const input = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return respond({ ok: false, error: "invalid_request" }, 400);
  try {
    const viewer = await readR2Viewer(request);
    if (!viewer) return respond({ ok: false, error: "answer_not_found" }, 404);
    const feedback = await readOwnAnswerFeedback(r2Query(), viewer, input.data.answerId, input.data.revision);
    return feedback === null || feedback === undefined ? respond({ ok: false, error: "answer_not_found" }, 404) : respond({ ok: true, feedback });
  } catch { return respond({ ok: false, error: "feedback_unavailable" }, 503); }
}

export async function POST(request: NextRequest) {
  if (process.env.R2_SOURCE_GOVERNANCE_ENABLED !== "true") return respond({ ok: false, error: "feedback_disabled" }, 404);
  if (!ingressSameOrigin(request)) return respond({ ok: false, error: "invalid_origin" }, 403);
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return respond({ ok: false, error: mutation.error }, mutation.statusCode);
  const body = await readBoundedIngressJson(request, { maxRequestBytes: 16_384 });
  if (!body.ok) return respond({ ok: false, error: "invalid_request" }, body.status);
  const input = feedbackSubmissionSchema.safeParse(body.value);
  if (!input.success) return respond({ ok: false, error: "invalid_request" }, 400);
  try {
    const viewer = await readR2Viewer(request);
    if (!viewer) return respond({ ok: false, error: "answer_not_found" }, 404);
    const result = await submitAnswerFeedback(r2Query(), viewer, input.data);
    const status = result.ok ? 200 : result.error === "answer_not_found" ? 404 : result.error === "feedback_rate_limited" ? 429
      : result.error === "feedback_replay_conflict" ? 409 : result.error === "invalid_request" ? 400 : 503;
    return respond(result, status);
  } catch { return respond({ ok: false, error: "feedback_unavailable" }, 503); }
}
