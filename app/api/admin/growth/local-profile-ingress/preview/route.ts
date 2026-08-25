import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { parseLocalProfilePerformanceCsv } from "../../../../../lib/growth/local-profile-performance-ingress";
import {
  localProfilePerformanceIngressRequestError,
  localProfilePerformanceIngressSameOrigin,
  privateLocalProfilePerformanceIngressResponse,
  readLocalProfilePerformanceIngressJson,
} from "../../../../../lib/growth/local-profile-performance-ingress-http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!localProfilePerformanceIngressSameOrigin(request)) {
    return privateLocalProfilePerformanceIngressResponse(
      NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 }),
    );
  }

  const auth = await requireLeadCenterApiPermission(request, "growth:manage");
  if (!auth.ok) return privateLocalProfilePerformanceIngressResponse(auth.response);

  const parsed = await readLocalProfilePerformanceIngressJson(request);
  if (!parsed.ok) return localProfilePerformanceIngressRequestError(parsed.status);
  const keys = Object.keys(parsed.value);
  if (keys.length !== 1 || keys[0] !== "csv" || typeof parsed.value.csv !== "string") {
    return localProfilePerformanceIngressRequestError(400);
  }

  const preview = parseLocalProfilePerformanceCsv(parsed.value.csv);
  return privateLocalProfilePerformanceIngressResponse(NextResponse.json({ ok: true, preview }));
}
