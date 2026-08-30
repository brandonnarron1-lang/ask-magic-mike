import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { importOrganicSearchCsv } from "../../../../../lib/persistence/neonOrganicSearchIngress";
import {
  organicSearchIngressRequestError,
  organicSearchIngressSameOrigin,
  privateOrganicSearchIngressResponse,
  readOrganicSearchIngressJson,
} from "../../../../../lib/growth/organic-search-ingress-http";

export const runtime = "nodejs";

const REQUIRED_KEYS = [
  "approvalReference",
  "batchFingerprint",
  "confirmation",
  "csv",
] as const;

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
  const keys = Object.keys(parsed.value).sort();
  if (
    keys.length !== REQUIRED_KEYS.length ||
    REQUIRED_KEYS.some((key, index) => keys[index] !== key) ||
    REQUIRED_KEYS.some((key) => typeof parsed.value[key] !== "string")
  ) return organicSearchIngressRequestError(400);

  const result = await importOrganicSearchCsv({
    csv: parsed.value.csv as string,
    batchFingerprint: parsed.value.batchFingerprint as string,
    approvalReference: parsed.value.approvalReference as string,
    confirmation: parsed.value.confirmation as string,
    actor: `lead-center:${auth.principal.userId}`,
  });

  if (!result.ok) {
    return privateOrganicSearchIngressResponse(
      NextResponse.json(
        { ok: false, error: result.error, ...(result.preview ? { preview: result.preview } : {}) },
        { status: result.statusCode },
      ),
    );
  }

  return privateOrganicSearchIngressResponse(NextResponse.json({
    ok: true,
    receipt: {
      batchId: result.batchId,
      auditId: result.auditId,
      idempotentReplay: result.idempotentReplay,
      rowCount: result.rowCount,
      insertedSignals: result.insertedSignals,
      updatedSignals: result.updatedSignals,
      unchangedSignals: result.unchangedSignals,
      opportunityRows: result.opportunityRows,
      insertedOpportunities: result.insertedOpportunities,
      updatedOpportunities: result.updatedOpportunities,
      unchangedOpportunities: result.unchangedOpportunities,
      batchFingerprint: result.preview.batchFingerprint,
      rawCsvRetained: false,
      rawQueriesRetained: false,
      providerCallPerformed: false,
    },
  }));
}
