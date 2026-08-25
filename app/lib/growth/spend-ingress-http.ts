import { NextResponse, type NextRequest } from "next/server";
import { SPEND_INGRESS_MAX_BYTES } from "./spend-ingress";

// JSON escaping can nearly double an otherwise valid CSV (for example, quoted
// fields and line breaks). Keep the transport bounded without rejecting a CSV
// that is still inside the canonical parser limit.
const MAX_REQUEST_BYTES = SPEND_INGRESS_MAX_BYTES * 2 + 8 * 1024;
const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function privateSpendIngressResponse(response: NextResponse) {
  for (const [name, value] of Object.entries(PRIVATE_JSON_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function spendIngressSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === "same-origin");
}

export async function readSpendIngressJson(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false as const, status: 415 as const };
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false as const, status: 413 as const };
  }
  if (!request.body) return { ok: false as const, status: 400 as const };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let bodyText = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    byteLength += chunk.value.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false as const, status: 413 as const };
    }
    bodyText += decoder.decode(chunk.value, { stream: true });
  }
  bodyText += decoder.decode();

  try {
    const parsed: unknown = JSON.parse(bodyText);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ok: true as const, value: parsed as Record<string, unknown> }
      : { ok: false as const, status: 400 as const };
  } catch {
    return { ok: false as const, status: 400 as const };
  }
}

export function spendIngressRequestError(status: 400 | 413 | 415) {
  const error = status === 413
    ? "payload_too_large"
    : status === 415
      ? "unsupported_media_type"
      : "invalid_request";
  return privateSpendIngressResponse(NextResponse.json({ ok: false, error }, { status }));
}
