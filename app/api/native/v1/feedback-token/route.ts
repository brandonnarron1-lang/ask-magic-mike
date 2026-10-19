import { NextRequest, NextResponse } from "next/server";
import { privateIngressResponse } from "../../../../lib/growth/ingress-http";
import { readOwnAnswerFeedback } from "@/lib/intelligence/feedback";
import { readR2Viewer, r2Enabled, r2Query } from "@/lib/intelligence/viewer";
import { issueNativeFeedbackToken, nativeAnswerReferenceSchema, nativeRequestContext } from "@/lib/intelligence/native-feedback";

export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => privateIngressResponse(NextResponse.json(body, { status }));

/** Read-only, own-answer CSRF issuance. Never creates a guest/session/answer. */
export async function GET(request: NextRequest) {
  if (!r2Enabled()) return response({ ok: false, error: "feedback_disabled" }, 404);
  if (!nativeRequestContext(request)) return response({ ok: false, error: "native_context_required" }, 403);
  const input = nativeAnswerReferenceSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return response({ ok: false, error: "invalid_request" }, 400);
  try {
    const viewer = await readR2Viewer(request);
    if (!viewer) return response({ ok: false, error: "answer_not_found" }, 404);
    const own = await readOwnAnswerFeedback(r2Query(), viewer, input.data.answerId, input.data.revision);
    if (own === null || own === undefined) return response({ ok: false, error: "answer_not_found" }, 404);
    return response({ ok: true, ...issueNativeFeedbackToken(process.env.BETTER_AUTH_SECRET || "", new URL(request.url).origin, viewer, input.data) });
  } catch { return response({ ok: false, error: "feedback_unavailable" }, 503); }
}
