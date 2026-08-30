import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import {
  isVendorIngressTestProfile,
  runVendorIngressContractInspection,
} from "../../../../../lib/growth/vendor-ingress-contracts";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512;
const PRIVATE_JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function privateResponse(response: NextResponse) {
  for (const [name, value] of Object.entries(PRIVATE_JSON_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === "same-origin");
}

async function readBoundedObject(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false as const, status: 415 as const };
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
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
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false as const, status: 413 as const };
    }
    bodyText += decoder.decode(chunk.value, { stream: true });
  }
  bodyText += decoder.decode();
  try {
    const value: unknown = JSON.parse(bodyText);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true as const, value: value as Record<string, unknown> }
      : { ok: false as const, status: 400 as const };
  } catch {
    return { ok: false as const, status: 400 as const };
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return privateResponse(NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 }));
  }

  const auth = await requireLeadCenterApiPermission(request, "growth:manage");
  if (!auth.ok) return privateResponse(auth.response);

  const parsed = await readBoundedObject(request);
  if (!parsed.ok) {
    const error = parsed.status === 413
      ? "payload_too_large"
      : parsed.status === 415
        ? "unsupported_media_type"
        : "invalid_request";
    return privateResponse(NextResponse.json({ ok: false, error }, { status: parsed.status }));
  }
  const requestKeys = Object.keys(parsed.value);
  if (requestKeys.length !== 1 || requestKeys[0] !== "profile") {
    return privateResponse(NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 }));
  }
  if (!isVendorIngressTestProfile(parsed.value.profile)) {
    return privateResponse(NextResponse.json({ ok: false, error: "unsupported_profile" }, { status: 400 }));
  }

  const inspection = runVendorIngressContractInspection(parsed.value.profile);
  return privateResponse(NextResponse.json({ ok: true, inspection }));
}
