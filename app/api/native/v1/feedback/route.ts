import { NextRequest, NextResponse } from "next/server";
import { privateIngressResponse, readBoundedIngressJson } from "../../../../lib/growth/ingress-http";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { feedbackSubmissionSchema, submitAnswerFeedback } from "@/lib/intelligence/feedback";
import { readR2Viewer, r2Enabled, r2Query } from "@/lib/intelligence/viewer";
import { nativeRequestContext, verifyNativeFeedbackToken } from "@/lib/intelligence/native-feedback";

export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => privateIngressResponse(NextResponse.json(body, { status }));

/** Same lifecycle, scope, rate, replay and audit service as web feedback. No
 * permission is manufactured by claiming to be native or by supplying a MAC.
 */
export async function POST(request: NextRequest) {
  if (!r2Enabled()) return response({ ok: false, error: "feedback_disabled" }, 404);
  if (!nativeRequestContext(request)) return response({ ok: false, error: "native_context_required" }, 403);
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return response({ ok: false, error: mutation.error }, mutation.statusCode);
  const body = await readBoundedIngressJson(request, { maxRequestBytes: 16_384 });
  if (!body.ok) return response({ ok: false, error: "invalid_request" }, body.status);
  const input = feedbackSubmissionSchema.safeParse(body.value);
  if (!input.success) return response({ ok: false, error: "invalid_request" }, 400);
  try {
    const viewer = await readR2Viewer(request);
    if (!viewer) return response({ ok: false, error: "answer_not_found" }, 404);
    if (!verifyNativeFeedbackToken(request.headers.get("x-amm-feedback-csrf"), process.env.BETTER_AUTH_SECRET || "", new URL(request.url).origin, viewer, { answerId: input.data.answerId, revision: input.data.revision })) {
      return response({ ok: false, error: "invalid_csrf" }, 403);
    }
    const result = await submitAnswerFeedback(r2Query(), viewer, input.data);
    const status = result.ok ? 200 : result.error === "answer_not_found" ? 404 : result.error === "feedback_rate_limited" ? 429
      : result.error === "feedback_replay_conflict" ? 409 : result.error === "invalid_request" ? 400 : 503;
    return response(result, status);
  } catch { return response({ ok: false, error: "feedback_unavailable" }, 503); }
}
