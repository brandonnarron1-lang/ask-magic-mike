import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { parseMarketingSpendCsv } from "../../../../../lib/growth/spend-ingress";
import {
  privateSpendIngressResponse,
  readSpendIngressJson,
  spendIngressRequestError,
  spendIngressSameOrigin,
} from "../../../../../lib/growth/spend-ingress-http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!spendIngressSameOrigin(request)) {
    return privateSpendIngressResponse(
      NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 }),
    );
  }

  const auth = await requireLeadCenterApiPermission(request, "growth:manage");
  if (!auth.ok) return privateSpendIngressResponse(auth.response);

  const parsed = await readSpendIngressJson(request);
  if (!parsed.ok) return spendIngressRequestError(parsed.status);
  const keys = Object.keys(parsed.value);
  if (keys.length !== 1 || keys[0] !== "csv" || typeof parsed.value.csv !== "string") {
    return spendIngressRequestError(400);
  }

  const preview = parseMarketingSpendCsv(parsed.value.csv);
  return privateSpendIngressResponse(NextResponse.json({ ok: true, preview }));
}
