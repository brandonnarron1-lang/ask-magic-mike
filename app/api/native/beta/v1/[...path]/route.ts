import { NextRequest, NextResponse } from "next/server";
import { betaViewer } from "@/lib/intelligence/beta-access";
import { BETA_PREFIX, betaRoute } from "@/lib/intelligence/beta-contract";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { r2Query } from "@/lib/intelligence/viewer";
import { governedReply } from "@/lib/intelligence/source-lifecycle";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { privateIngressResponse, readBoundedIngressJson } from "../../../../../lib/growth/ingress-http";
import { GET as answer } from "../../../../intelligence/answers/route";
import { GET as feedback } from "../../../../intelligence/feedback/route";
import { GET as token } from "../../../v1/feedback-token/route";
import { POST as submitFeedback } from "../../../v1/feedback/route";

export const dynamic = "force-dynamic";
const respond = (body: unknown, status: number) => privateIngressResponse(NextResponse.json(body, { status }));
async function handle(request: NextRequest) {
  const url = new URL(request.url), path = url.pathname.slice(BETA_PREFIX.length);
  if (!betaRoute(path, request.method)) return respond({ ok: false, error: "beta_route_unavailable" }, 404);
  try {
    const { viewer } = await betaViewer(request);
    // GETs remain read-only; every POST retains the existing physical-target
    // mutation fence. No legacy paid-chat dispatch or intake handler is called.
    if (request.method === "POST") {
      const mutation = assertDatabaseMutationAllowed();
      if (!mutation.ok) return respond({ ok: false, error: mutation.error }, mutation.statusCode);
    }
    if (path === "/api/chat/message") {
      const limit = await checkRateLimit(viewer.ownerScope, 12, 3600000, "chatMessage");
      if (!limit.allowed || !limit.durable) return respond({ ok: false, error: "beta_rate_or_storage_limit" }, 429);
      const body = await readBoundedIngressJson(request, { maxRequestBytes: 8192 });
      if (!body.ok) return respond({ ok: false, error: "invalid_request" }, body.status);
      const value = body.value as Record<string, unknown>;
      if (!value || Object.keys(value).sort().join() !== "knowledge_version,message"
        || value.knowledge_version !== "amm.public-knowledge.v1" || typeof value.message !== "string"
        || !value.message.trim() || value.message.length > 2000) return respond({ ok: false, error: "invalid_request" }, 400);
      // Existing release service rechecks source AND session atomically. This
      // final fence additionally refuses an expiry/revocation during retrieval.
      const result = await governedReply(r2Query(), value.message.trim(), viewer, async () => { await betaViewer(request); });
      return respond(result, 200);
    }
    url.pathname = path;
    let forwardedBody: string | undefined;
    if (request.method === "POST") {
      const bounded = await readBoundedIngressJson(request, { maxRequestBytes: 16384 });
      if (!bounded.ok) return respond({ ok: false, error: "invalid_request" }, bounded.status);
      forwardedBody = JSON.stringify(bounded.value);
    }
    const delegated = new NextRequest(url, { method: request.method, headers: request.headers,
      ...(forwardedBody === undefined ? {} : { body: forwardedBody }) });
    if (path === "/api/intelligence/answers") return answer(delegated);
    if (path === "/api/intelligence/feedback") return feedback(delegated);
    if (path === "/api/native/v1/feedback-token") return token(delegated);
    return submitFeedback(delegated);
  } catch { return respond({ ok: false, error: "beta_access_or_service_unavailable" }, 403); }
}
export const GET = handle;
export const POST = handle;
