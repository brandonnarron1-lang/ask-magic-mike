import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DistributionPage from "../../app/admin/distribution/page";
import { buildGrowthIntelligence } from "../../app/lib/growth/intelligence";
import { normalizeGrowthPlacementDelivery as normalizeAggregate } from "../../app/lib/persistence/neonGrowthIntelligenceView";

const mocks = vi.hoisted(() => ({ growth: vi.fn(), permission: vi.fn(), wordpress: vi.fn() }));
vi.mock("../../app/lib/growthIntelligenceView", () => ({ loadGrowthIntelligence: mocks.growth }));
vi.mock("../../src/lib/admin/rbac-session", () => ({ requireLeadCenterPermission: mocks.permission }));
vi.mock("../../src/lib/preview-security", () => ({ isPreviewDataDisabled: () => true, isPreviewRuntime: () => true }));
vi.mock("../../app/lib/growth/wordpress-activation-change-set", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../app/lib/growth/wordpress-activation-change-set")>(),
  loadWordPressActivationChangeSets: mocks.wordpress,
}));
vi.mock("../../app/lib/persistence/neonOwnedDemandPublicationProofs", () => ({
  loadOwnedDemandPublicationProofLedger: async () => ({ configured: true, schemaReady: true, proofs: [] }),
}));
vi.mock("../../app/admin/distribution/actions", () => ({ recordOwnedDemandPublicationProofAction: vi.fn() }));
vi.mock("../../app/admin/distribution/CopyDemandAsset", () => ({ CopyDemandAsset: () => null }));
vi.mock("../../app/admin/distribution/NativePublicationHandoff", () => ({ NativePublicationHandoff: () => null }));
vi.mock("../../app/admin/distribution/OpenHouseQrPacketBuilder", () => ({ OpenHouseQrPacketBuilder: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));

function row(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026",
    utm_content: "wordpress_we_buy_homes", operator_key: "operator:mike", delivery_state: "accepted_unconfirmed", envelopes: 1, ...extra };
}
function coverage(operator_key: string, inquiries_with_envelope: number) {
  return row({ operator_key, delivery_state: "coverage", envelopes: 0, accepted_inquiries: 1, inquiries_with_envelope });
}
function normalizeGrowthPlacementDelivery(rows: Record<string, unknown>[]) {
  return normalizeAggregate(rows.length === 0 ? [] : [
    ...["operator:mike", "operator:brandon"].map((operator) => coverage(operator, rows.some((value) => value.operator_key === operator) ? 1 : 0)), ...rows,
  ]);
}
function growth(placementDelivery = normalizeGrowthPlacementDelivery([]), overrides = {}) {
  return { ...buildGrowthIntelligence({ leads: [] }), configured: true, schemaReady: true,
    ownedDemandSignals: [{ source: "ourtownproperties", medium: "owned_media", campaign: "amm_owned_demand_2026", content: "wordpress_we_buy_homes", leads: 1 }],
    placementDelivery, ...overrides };
}
async function page() {
  const html = renderToStaticMarkup(await DistributionPage({ searchParams: Promise.resolve({}) }));
  return new DOMParser().parseFromString(html, "text/html");
}
function section(document: Document) {
  return document.querySelector('[aria-label="Placement operator delivery"]')!;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue({ role: "read_only_analyst", userId: "synthetic-analyst", agentId: null });
  mocks.wordpress.mockResolvedValue([]);
  mocks.growth.mockResolvedValue(growth());
});

describe("protected distribution operator delivery UI", () => {
  it("preserves report permission before all reads, including the existing WordPress loader", async () => {
    mocks.permission.mockRejectedValueOnce(new Error("synthetic authorization refusal"));
    await expect(page()).rejects.toThrow("synthetic authorization refusal");
    expect(mocks.permission).toHaveBeenCalledWith("report:view");
    expect(mocks.growth).not.toHaveBeenCalled();
    expect(mocks.wordpress).not.toHaveBeenCalled();
  });

  it("shows separate allowlisted operators/envelope states without changing existing lead totals or labels", async () => {
    mocks.growth.mockResolvedValue(growth(normalizeGrowthPlacementDelivery([
      row(), row({ operator_key: "operator:brandon", delivery_state: "delivered" }),
    ])));
    const document = await page();
    const delivery = section(document);
    expect(delivery.getAttribute("data-delivery-available")).toBe("true");
    expect(delivery.textContent).toContain("not distinct leads or callback events");
    expect(delivery.textContent).toContain("Recipient-server delivery is not mailbox receipt");
    expect([...delivery.querySelectorAll("tbody th")].map((cell) => cell.textContent)).toEqual(["Mike", "Brandon"]);
    const rows = [...delivery.querySelectorAll("tbody tr")];
    expect([...rows[0].querySelectorAll("td")].map((cell) => cell.textContent)).toEqual(["1", "0", "1", "0", "0", "0", "1", "0", "0"]);
    expect([...rows[1].querySelectorAll("td")].map((cell) => cell.textContent)).toEqual(["1", "0", "1", "0", "0", "0", "0", "1", "0"]);
    expect(delivery.textContent).toContain("Accepted inquiries in this bounded cohort: 1");
    expect(delivery.textContent).toContain("30-day window");
    expect(delivery.textContent).toContain("at most 5,000");
    expect(delivery.textContent).toContain("Not full-scale totals or distinct contacts");
    const totals = document.querySelector('[aria-label="Owned demand measurement status"]')!;
    expect(totals.textContent).toContain("Eligible live leads · 30d");
    expect(totals.textContent).toContain("Useful attribution");
    expect(totals.textContent).toContain("Legacy WordPress signals");
    const owned = [...totals.querySelectorAll("article")].find((article) => article.textContent?.includes("Owned-source signals"))!;
    expect(owned.querySelectorAll("p")[1].textContent).toBe("1"); // Two envelopes are not two leads.
    expect(delivery.querySelector("form, button, input")).toBeNull();
    expect(delivery.textContent).not.toMatch(/@|private_intake_snapshot|recipient_reference/);
  });

  it("renders a verified empty cohort as zero accepted inquiries, not delivery success", async () => {
    const delivery = section(await page());
    expect(delivery.textContent).toContain("0 accepted inquiries");
    expect(delivery.textContent).toContain("does not establish delivery or expected v6 eligibility");
    expect(delivery.querySelector("table")).toBeNull();
  });

  it("shows accepted inquiries with no outbox and a non-failure difference for both operators", async () => {
    mocks.growth.mockResolvedValue(growth(normalizeAggregate([coverage("operator:mike", 0), coverage("operator:brandon", 0)])));
    const delivery = section(await page());
    expect(delivery.textContent).toContain("Accepted inquiries in this bounded cohort: 1");
    expect(delivery.textContent).toContain("No v6 envelope recorded");
    expect(delivery.textContent).toContain("not a delivery failure or an eligibility assessment");
    expect(delivery.textContent).toContain("pre-cutoff or held inquiries may intentionally have none");
    for (const cells of [...delivery.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent))) {
      expect(cells).toEqual(["0", "1", "0", "0", "0", "0", "0", "0", "0"]);
    }
  });

  it("shows the difference only for the operator with no recorded envelope", async () => {
    mocks.growth.mockResolvedValue(growth(normalizeGrowthPlacementDelivery([row()])));
    const rows = [...section(await page()).querySelectorAll("tbody tr")];
    expect(rows[0].querySelectorAll("td")[1].textContent).toBe("0");
    expect(rows[1].querySelectorAll("td")[1].textContent).toBe("1");
  });

  it.each([undefined, { configured: false, unavailableReason: "schema_or_grants", placements: [] },
    { configured: false, unavailableReason: "query_failed", placements: [] }])("renders absent or unavailable optional evidence as unavailable, never zero", async (snapshot) => {
    mocks.growth.mockResolvedValue({ ...growth(), placementDelivery: snapshot });
    const delivery = section(await page());
    expect(delivery.getAttribute("data-delivery-available")).toBe("false");
    expect(delivery.textContent).toContain("Unavailable is not zero");
    expect(delivery.textContent).not.toContain("0 accepted inquiries");
    expect(delivery.querySelector("table")).toBeNull();
  });

  it("does not expose apparently healthy envelope counts while canonical measurement is unavailable", async () => {
    mocks.growth.mockResolvedValue(growth(normalizeGrowthPlacementDelivery([row()]), { schemaReady: false }));
    const delivery = section(await page());
    expect(delivery.getAttribute("data-delivery-available")).toBe("false");
    expect(delivery.textContent).toContain("Canonical distribution measurement is unavailable");
    expect(delivery.querySelector("table")).toBeNull();
  });

  it("renders unknown operator metadata as dashes rather than a false zero or an unallowlisted identity", async () => {
    mocks.growth.mockResolvedValue(growth(normalizeGrowthPlacementDelivery([
      row(), row({ operator_key: "unapproved@example.test" }),
    ])));
    const delivery = section(await page());
    expect(delivery.textContent).toContain("Per-operator values are unavailable, not zero");
    expect(delivery.textContent).toContain("Accepted inquiries in this bounded cohort: 1");
    expect([...delivery.querySelectorAll("tbody td")].every((cell) => cell.textContent === "—")).toBe(true);
    expect(delivery.textContent).not.toContain("unapproved@example.test");
  });
});
