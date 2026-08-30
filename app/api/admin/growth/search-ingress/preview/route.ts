import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { parseOrganicSearchCsv } from "../../../../../lib/growth/organic-search-ingress";
import {
  organicSearchIngressRequestError,
  organicSearchIngressSameOrigin,
  privateOrganicSearchIngressResponse,
  readOrganicSearchIngressJson,
} from "../../../../../lib/growth/organic-search-ingress-http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!organicSearchIngressSameOrigin(request)) {
    return privateOrganicSearchIngressResponse(
      NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 }),
    );
  }

  const auth = await requireLeadCenterApiPermission(request, "growth:manage");
  if (!auth.ok) return privateOrganicSearchIngressResponse(auth.response);

  const parsed = await readOrganicSearchIngressJson(request);
  if (!parsed.ok) return organicSearchIngressRequestError(parsed.status);
  const keys = Object.keys(parsed.value);
  if (keys.length !== 1 || keys[0] !== "csv" || typeof parsed.value.csv !== "string") {
    return organicSearchIngressRequestError(400);
  }

  const preview = parseOrganicSearchCsv(parsed.value.csv);
  return privateOrganicSearchIngressResponse(NextResponse.json({ ok: true, preview }));
}
