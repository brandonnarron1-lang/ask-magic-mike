import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV } from "../../app/lib/growth/local-profile-performance-ingress";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  importReport: vi.fn(),
}));

vi.mock("@/lib/admin/rbac-session", () => ({
  requireLeadCenterApiPermission: mocks.requirePermission,
}));

vi.mock("../../app/lib/persistence/neonLocalProfilePerformanceIngress", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../app/lib/persistence/neonLocalProfilePerformanceIngress")
  >();
  return { ...actual, importLocalProfilePerformanceCsv: mocks.importReport };
});

import { POST as previewReport } from "../../app/api/admin/growth/local-profile-ingress/preview/route";
import { POST as commitReport } from "../../app/api/admin/growth/local-profile-ingress/commit/route";

const PREVIEW_URL = "https://www.askmagicmike.com/api/admin/growth/local-profile-ingress/preview";
const COMMIT_URL = "https://www.askmagicmike.com/api/admin/growth/local-profile-ingress/commit";

function authorized() {
  mocks.requirePermission.mockResolvedValue({
    ok: true,
    principal: {
      userId: "operator-123",
      role: "administrator",
      agentId: null,
      email: "synthetic-operator@example.test",
      name: "Synthetic Operator",
    },
  });
}

function request(url: string, body: Record<string, unknown>, origin = "https://www.askmagicmike.com") {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": origin === "https://www.askmagicmike.com" ? "same-origin" : "cross-site",
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("protected local-profile performance ingress APIs", () => {
  it("validates bounded synthetic aggregate evidence without writing and returns private headers", async () => {
    authorized();
    const response = await previewReport(request(PREVIEW_URL, { csv: SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      preview: {
        ok: true,
        synthetic: true,
        rawCsvRetained: false,
        rawSearchTermsRetained: false,
        providerLocationIdRetained: false,
        providerCallPerformed: false,
      },
    });
    expect(mocks.importReport).not.toHaveBeenCalled();
  });

  it("rejects foreign origins before session or database work", async () => {
    const response = await previewReport(request(
      PREVIEW_URL,
      { csv: SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV },
      "https://attacker.example",
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_origin" });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.importReport).not.toHaveBeenCalled();
  });

  it("copies private headers onto authorization failures", async () => {
    mocks.requirePermission.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    });
    const response = await previewReport(request(PREVIEW_URL, { csv: SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV }));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("passes only authenticated principal identity into the atomic commit service", async () => {
    authorized();
    mocks.importReport.mockResolvedValue({
      ok: true,
      batchId: "11111111-1111-4111-8111-111111111111",
      auditId: "22222222-2222-4222-8222-222222222222",
      idempotentReplay: false,
      rowCount: 5,
      insertedSignals: 5,
      updatedSignals: 0,
      unchangedSignals: 0,
      insertedOpportunities: 1,
      updatedOpportunities: 0,
      unchangedOpportunities: 0,
      preview: { batchFingerprint: "a".repeat(64) },
    });
    const body = {
      approvalReference: "GBP Performance 2026-08",
      batchFingerprint: "a".repeat(64),
      confirmation: "IMPORT REVIEWED LOCAL PROFILE PERFORMANCE",
      csv: "canonical-aggregate-csv-in-memory-only",
    };
    const response = await commitReport(request(COMMIT_URL, body));
    expect(response.status).toBe(200);
    expect(mocks.importReport).toHaveBeenCalledWith({
      ...body,
      actor: "lead-center:operator-123",
    });
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      receipt: {
        rowCount: 5,
        insertedSignals: 5,
        insertedOpportunities: 1,
        rawCsvRetained: false,
        rawSearchTermsRetained: false,
        providerLocationIdRetained: false,
        providerCallPerformed: false,
        profileMutationPerformed: false,
        contentPublished: false,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("canonical-aggregate-csv-in-memory-only");
  });

  it("rejects extra commit keys and oversized bodies before mutation", async () => {
    authorized();
    const extra = await commitReport(request(COMMIT_URL, {
      approvalReference: "report",
      batchFingerprint: "a".repeat(64),
      confirmation: "IMPORT REVIEWED LOCAL PROFILE PERFORMANCE",
      csv: "csv",
      locationId: "prohibited",
    }));
    expect(extra.status).toBe(400);
    await expect(extra.json()).resolves.toEqual({ ok: false, error: "invalid_request" });

    const oversized = await previewReport(request(PREVIEW_URL, { csv: "x".repeat(300_000) }));
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toEqual({ ok: false, error: "payload_too_large" });
    expect(mocks.importReport).not.toHaveBeenCalled();
  });
});
