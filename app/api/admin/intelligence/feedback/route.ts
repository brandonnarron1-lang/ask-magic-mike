import { NextResponse, type NextRequest } from "next/server";
import { ingressSameOrigin, privateIngressResponse, readBoundedIngressJson } from "../../../../lib/growth/ingress-http";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { feedbackReviewSchema, listFeedbackQueue, reviewAnswerFeedback } from "@/lib/intelligence/feedback";
import { r2Query } from "@/lib/intelligence/viewer";

export const dynamic = "force-dynamic";
const respond = (body: unknown, status = 200) => privateIngressResponse(NextResponse.json(body, { status }));

export async function GET(request: NextRequest) {
  if (process.env.R2_SOURCE_GOVERNANCE_ENABLED !== "true") return respond({ ok: false, error: "feedback_disabled" }, 404);
  const auth = await requireLeadCenterApiPermission(request, "user:manage");
  if (!auth.ok) return privateIngressResponse(auth.response);
  try {
    const feedback = await listFeedbackQueue(r2Query(), auth.principal.userId);
    return feedback === null || feedback === undefined ? respond({ ok: false, error: "forbidden" }, 403) : respond({ ok: true, feedback });
  } catch { return respond({ ok: false, error: "feedback_unavailable" }, 503); }
}

export async function POST(request: NextRequest) {
  if (process.env.R2_SOURCE_GOVERNANCE_ENABLED !== "true") return respond({ ok: false, error: "feedback_disabled" }, 404);
  if (!ingressSameOrigin(request)) return respond({ ok: false, error: "invalid_origin" }, 403);
  const auth = await requireLeadCenterApiPermission(request, "user:manage");
  if (!auth.ok) return privateIngressResponse(auth.response);
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return respond({ ok: false, error: mutation.error }, mutation.statusCode);
  const body = await readBoundedIngressJson(request, { maxRequestBytes: 4096 });
  if (!body.ok) return respond({ ok: false, error: "invalid_request" }, body.status);
  const input = feedbackReviewSchema.safeParse(body.value);
  if (!input.success) return respond({ ok: false, error: "invalid_request" }, 400);
  try {
    const result = await reviewAnswerFeedback(r2Query(), auth.principal.userId, input.data);
    const status = result.ok ? 200 : result.error === "forbidden" ? 403 : result.error === "feedback_not_found" ? 404
      : result.error === "feedback_rate_limited" ? 429 : ["stale_feedback_revision", "feedback_replay_conflict", "invalid_feedback_transition", "regression_draft_exists"].includes(result.error || "") ? 409
      : result.error === "invalid_request" ? 400 : 503;
    return respond({ ...result, sendsCommunication: false, createsTask: false, modelCalls: 0 }, status);
  } catch { return respond({ ok: false, error: "feedback_unavailable" }, 503); }
}
