import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { importMarketingSpendCsv } from "../../../../../lib/persistence/neonMarketingSpendIngress";
import {
  privateSpendIngressResponse,
  readSpendIngressJson,
  spendIngressRequestError,
  spendIngressSameOrigin,
} from "../../../../../lib/growth/spend-ingress-http";

export const runtime = "nodejs";

const REQUIRED_KEYS = [
  "approvalReference",
  "batchFingerprint",
  "confirmation",
  "csv",
] as const;

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
  const keys = Object.keys(parsed.value).sort();
  if (
    keys.length !== REQUIRED_KEYS.length ||
    REQUIRED_KEYS.some((key, index) => keys[index] !== key) ||
    REQUIRED_KEYS.some((key) => typeof parsed.value[key] !== "string")
  ) return spendIngressRequestError(400);

  const result = await importMarketingSpendCsv({
    csv: parsed.value.csv as string,
    batchFingerprint: parsed.value.batchFingerprint as string,
    approvalReference: parsed.value.approvalReference as string,
    confirmation: parsed.value.confirmation as string,
    actor: `lead-center:${auth.principal.userId}`,
  });

  if (!result.ok) {
    return privateSpendIngressResponse(
      NextResponse.json(
        { ok: false, error: result.error, ...(result.preview ? { preview: result.preview } : {}) },
        { status: result.statusCode },
      ),
    );
  }

  return privateSpendIngressResponse(NextResponse.json({
    ok: true,
    receipt: {
      batchId: result.batchId,
      auditId: result.auditId,
      idempotentReplay: result.idempotentReplay,
      rowCount: result.rowCount,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      unchangedRows: result.unchangedRows,
      batchFingerprint: result.preview.batchFingerprint,
      rawCsvRetained: false,
    },
  }));
}
