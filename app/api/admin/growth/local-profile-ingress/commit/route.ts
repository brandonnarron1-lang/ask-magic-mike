import { NextRequest, NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { importLocalProfilePerformanceCsv } from "../../../../../lib/persistence/neonLocalProfilePerformanceIngress";
import {
  localProfilePerformanceIngressRequestError,
  localProfilePerformanceIngressSameOrigin,
  privateLocalProfilePerformanceIngressResponse,
  readLocalProfilePerformanceIngressJson,
} from "../../../../../lib/growth/local-profile-performance-ingress-http";

export const runtime = "nodejs";

const REQUIRED_KEYS = [
  "approvalReference",
  "batchFingerprint",
  "confirmation",
  "csv",
] as const;

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
  const keys = Object.keys(parsed.value).sort();
  if (
    keys.length !== REQUIRED_KEYS.length ||
    REQUIRED_KEYS.some((key, index) => keys[index] !== key) ||
    REQUIRED_KEYS.some((key) => typeof parsed.value[key] !== "string")
  ) return localProfilePerformanceIngressRequestError(400);

  const result = await importLocalProfilePerformanceCsv({
    csv: parsed.value.csv as string,
    batchFingerprint: parsed.value.batchFingerprint as string,
    approvalReference: parsed.value.approvalReference as string,
    confirmation: parsed.value.confirmation as string,
    actor: `lead-center:${auth.principal.userId}`,
  });

  if (!result.ok) {
    return privateLocalProfilePerformanceIngressResponse(
      NextResponse.json(
        { ok: false, error: result.error, ...(result.preview ? { preview: result.preview } : {}) },
        { status: result.statusCode },
      ),
    );
  }

  return privateLocalProfilePerformanceIngressResponse(NextResponse.json({
    ok: true,
    receipt: {
      batchId: result.batchId,
      auditId: result.auditId,
      idempotentReplay: result.idempotentReplay,
      rowCount: result.rowCount,
      insertedSignals: result.insertedSignals,
      updatedSignals: result.updatedSignals,
      unchangedSignals: result.unchangedSignals,
      insertedOpportunities: result.insertedOpportunities,
      updatedOpportunities: result.updatedOpportunities,
      unchangedOpportunities: result.unchangedOpportunities,
      batchFingerprint: result.preview.batchFingerprint,
      rawCsvRetained: false,
      rawSearchTermsRetained: false,
      providerLocationIdRetained: false,
      providerCallPerformed: false,
      profileMutationPerformed: false,
      contentPublished: false,
    },
  }));
}
