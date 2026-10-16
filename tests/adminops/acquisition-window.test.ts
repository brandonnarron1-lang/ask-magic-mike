import { describe, expect, it } from "vitest";
import { acquisitionBaselines, acquisitionTimestamp, parseAcquisitionWindow } from "../../app/lib/growth/acquisition-window";
import type { OwnedDemandPublicationProofLedger, OwnedDemandPublicationProofRow } from "../../app/lib/persistence/neonOwnedDemandPublicationProofs";
const now = new Date("2026-11-05T12:00:00.000Z");
const empty: OwnedDemandPublicationProofLedger = { configured: true, schemaReady: true, generatedAt: now.toISOString(), proofs: [] };
const proof = (extra = {}): OwnedDemandPublicationProofRow => ({ id: "synthetic-proof", channelKey: "ourtown_wordpress", placementKey: "wordpress_we_buy_homes", platformState: "live", proofType: "public_url", campaignKey: "amm_owned_demand_2026", source: "ourtownproperties", medium: "owned_media", content: "wordpress_we_buy_homes", trackedUrl: "https://www.askmagicmike.com/sell", evidenceUrl: "https://www.ourtownproperties.com/we-buy-homes/", evidenceReference: null, finalCopySha256: "a".repeat(64), creativeAssetKey: null, approvalReference: "synthetic", observedAt: "2026-11-01T05:30:00.000Z", createdAt: "2026-11-02T12:00:00.000Z", recordedBy: "synthetic", ...extra });
describe("bounded acquisition windows and observation provenance", () => {
  it("retains 30-day default and explicit 7-day elapsed window", () => {
    expect(parseAcquisitionWindow({}, empty, now)).toMatchObject({ ok: true, value: { mode: "30", from: "2026-10-06T12:00:00.000Z", to: now.toISOString() } });
    expect(parseAcquisitionWindow({ window: "7" }, empty, now)).toMatchObject({ ok: true, value: { from: "2026-10-29T12:00:00.000Z" } });
  });
  it.each(["2026-02-30T10:00Z", "2026-13-01T10:00Z", "2026-11-01T01:30", "2026-11-01T24:00Z", "2026-11-01T01:30+15:00", "private@example.test"])("rejects invalid or ambiguous timestamp %s", value => expect(acquisitionTimestamp(value)).toBeNull());
  it("requires explicit offsets and distinguishes repeated fall-back times", () => {
    expect(acquisitionTimestamp("2026-11-01T01:30-04:00")).toBe("2026-11-01T05:30:00.000Z");
    expect(acquisitionTimestamp("2026-11-01T01:30-05:00")).toBe("2026-11-01T06:30:00.000Z");
  });
  it.each([{ window: ["7", "30"] }, { window: "365" }, { placement: "unregistered" }, { window: "range", from: "2026-01-01T00:00Z", to: now.toISOString() }, { window: "range", from: now.toISOString(), to: now.toISOString() }, { window: "range", from: "2026-11-01T00:00Z", to: "2026-11-06T00:00Z" }])("rejects unbounded/duplicate/future/reversed input", filters => expect(parseAcquisitionWindow(filters, empty, now).ok).toBe(false));
  it("uses observed, not recorded or modified, time and requires one evidenced tag", () => {
    const ledger = { ...empty, proofs: [proof()] };
    expect(parseAcquisitionWindow({ window: "baseline", placement: "wordpress_we_buy_homes" }, ledger, now)).toMatchObject({ ok: true, value: { from: "2026-11-01T05:30:00.000Z", baseline: { recordedAt: "2026-11-02T12:00:00.000Z" } } });
    expect(parseAcquisitionWindow({ window: "baseline" }, ledger, now).ok).toBe(false);
    expect(parseAcquisitionWindow({ window: "baseline", placement: "wordpress_we_buy_homes" }, empty, now).ok).toBe(false);
    expect(acquisitionBaselines({ ...ledger, proofs: Array.from({ length: 250 }, () => proof()) }, now).wordpress_we_buy_homes).toBeNull();
  });
  it("does not substitute configured/test-like or mismatched-tag evidence for live proof", () => {
    for (const p of [proof({ platformState: "configured" }), proof({ medium: "seller_page_cta" }), proof({ content: "wordpress_homepage_ask_mike" }), proof({ observedAt: "2027-01-01T00:00:00Z" })]) expect(acquisitionBaselines({ ...empty, proofs: [p] }, now).wordpress_we_buy_homes).toBeNull();
  });
});
