import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNTHETIC_SPEND_CSV } from "../../app/lib/growth/spend-ingress";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  importSpend: vi.fn(),
}));

vi.mock("@/lib/admin/rbac-session", () => ({
  requireLeadCenterApiPermission: mocks.requirePermission,
}));

vi.mock("../../app/lib/persistence/neonMarketingSpendIngress", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../app/lib/persistence/neonMarketingSpendIngress")
  >();
  return { ...actual, importMarketingSpendCsv: mocks.importSpend };
});

import { POST as previewSpend } from "../../app/api/admin/growth/spend-ingress/preview/route";
import { POST as commitSpend } from "../../app/api/admin/growth/spend-ingress/commit/route";

const PREVIEW_URL = "https://www.askmagicmike.com/api/admin/growth/spend-ingress/preview";
const COMMIT_URL = "https://www.askmagicmike.com/api/admin/growth/spend-ingress/commit";

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

describe("protected marketing-spend ingress APIs", () => {
  it("validates a bounded synthetic CSV without writing and returns private headers", async () => {
    authorized();
    const response = await previewSpend(request(PREVIEW_URL, { csv: SYNTHETIC_SPEND_CSV }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      preview: { ok: true, synthetic: true, rawCsvRetained: false },
    });
    expect(mocks.importSpend).not.toHaveBeenCalled();
  });

  it("rejects foreign origins before session or database work", async () => {
    const response = await previewSpend(request(
      PREVIEW_URL,
      { csv: SYNTHETIC_SPEND_CSV },
      "https://attacker.example",
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_origin" });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.importSpend).not.toHaveBeenCalled();
  });

  it("copies private headers onto authorization failures", async () => {
    mocks.requirePermission.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    });
    const response = await previewSpend(request(PREVIEW_URL, { csv: SYNTHETIC_SPEND_CSV }));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("passes only the authenticated principal identity into the atomic commit service", async () => {
    authorized();
    mocks.importSpend.mockResolvedValue({
      ok: true,
      batchId: "11111111-1111-4111-8111-111111111111",
      auditId: "22222222-2222-4222-8222-222222222222",
      idempotentReplay: false,
      rowCount: 1,
      insertedRows: 1,
      updatedRows: 0,
      unchangedRows: 0,
      preview: { batchFingerprint: "a".repeat(64) },
    });
    const body = {
      approvalReference: "Google Ads report 2026-08-20",
      batchFingerprint: "a".repeat(64),
      confirmation: "IMPORT REVIEWED SPEND",
      csv: "canonical-csv-in-memory-only",
    };
    const response = await commitSpend(request(COMMIT_URL, body));
    expect(response.status).toBe(200);
    expect(mocks.importSpend).toHaveBeenCalledWith({
      ...body,
      actor: "lead-center:operator-123",
    });
    const payload = await response.json();
    expect(payload).toMatchObject({
      ok: true,
      receipt: {
        rowCount: 1,
        insertedRows: 1,
        rawCsvRetained: false,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("canonical-csv-in-memory-only");
  });

  it("rejects extra commit keys before mutation", async () => {
    authorized();
    const response = await commitSpend(request(COMMIT_URL, {
      approvalReference: "report",
      batchFingerprint: "a".repeat(64),
      confirmation: "IMPORT REVIEWED SPEND",
      csv: "csv",
      surprise: "field",
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(mocks.importSpend).not.toHaveBeenCalled();
  });
});
