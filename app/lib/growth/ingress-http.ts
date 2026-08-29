import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function privateIngressResponse(response: NextResponse) {
  for (const [name, value] of Object.entries(PRIVATE_JSON_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function ingressSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === "same-origin");
}

export async function readBoundedIngressJson(
  request: Request,
  options: { maxRequestBytes: number },
) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false as const, status: 415 as const };
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > options.maxRequestBytes) {
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
    if (byteLength > options.maxRequestBytes) {
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

export function ingressRequestError(status: 400 | 413 | 415) {
  const error = status === 413
    ? "payload_too_large"
    : status === 415
      ? "unsupported_media_type"
      : "invalid_request";
  return privateIngressResponse(NextResponse.json({ ok: false, error }, { status }));
}
