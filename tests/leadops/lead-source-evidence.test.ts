import { describe, expect, it } from "vitest";
import { projectLeadSourceEvidence } from "../../app/lib/leadSourceEvidence";

describe("read-only per-inquiry source evidence", () => {
  it("does not turn a widget campaign or generic channel into widget capture", () => {
    const evidence = projectLeadSourceEvidence({ source: "ourtownproperties", attribution: { source: "ourtownproperties", campaign: "website_widget", landing_page: "https://example.test/home-value" } });
    expect(evidence.inquiry.campaign).toEqual({ value: "website_widget", provenance: "client_reported" });
    expect(evidence.captureSurface.value).toBeNull();
    expect(evidence.transportAdapter.provenance).toBe("not_established");
    expect(evidence.selectedTab.value).toBeNull();
  });
  it("keeps first touch, latest touch, inquiry, surface, funnel and delivery distinct", () => {
    const row = { source_detail: "widget / embed / current / placement", lead_type: "seller", attribution: { source: "current", medium: "embed", content: "creative", placement: "placement", first_touch: { source: "first" }, last_touch: { source: "latest" } } };
    const before = structuredClone(row);
    const evidence = projectLeadSourceEvidence(row, [{ status: "sent", provider_message_id: "SYNTHETIC" }]);
    expect(evidence.inquiry.source.value).toBe("current");
    expect(evidence.firstTouch.source.value).toBe("first");
    expect(evidence.latestTouch.source.value).toBe("latest");
    expect(evidence.inquiry.content.value).toBe("creative");
    expect(evidence.inquiry.placement.value).toBe("placement");
    expect(evidence.captureSurface).toEqual({ value: "widget", provenance: "retained_intake_field" });
    expect(evidence.selectedFunnel.value).toBe("seller");
    expect(evidence.selectedTab.value).toBeNull();
    expect(evidence.notification).toEqual({ recordedIntentsInLoadedWindow: 1, receipt: "not_established" });
    expect(row).toEqual(before);
  });
  it("retains each repeat inquiry independently instead of borrowing canonical or current configuration", () => {
    const canonical = projectLeadSourceEvidence({ id: "canonical", attribution: { source: "older" } });
    const repeat = projectLeadSourceEvidence({ id: "repeat", duplicate_of_lead_id: "canonical", attribution: { source: "newer", first_touch: null } });
    expect(canonical.inquiry.source.value).toBe("older");
    expect(repeat.inquiry.source.value).toBe("newer");
    expect(repeat.firstTouch.source.value).toBeNull();
    expect(JSON.stringify(repeat)).not.toMatch(/canonical|duplicate_of|landing_page/);
  });
  it("does not project contact values, raw messages, URLs, click or provider identifiers", () => {
    const evidence = projectLeadSourceEvidence({ email: "private@example.test", phone: "555", question: "raw", attribution: { landing_page: "private-url", gclid: "click", first_touch: { email: "private" } } }, [{ id: "private-id", provider_message_id: "private-message" }]);
    expect(JSON.stringify(evidence)).not.toMatch(/private|raw|555|click/);
    expect(evidence.notification.recordedIntentsInLoadedWindow).toBe(1);
  });
  it("does not turn missing/failed history reads into zero intents or delivered proof", () => {
    expect(projectLeadSourceEvidence({ attribution: [] }).notification.recordedIntentsInLoadedWindow).toBeNull();
    expect(projectLeadSourceEvidence({}, []).notification.recordedIntentsInLoadedWindow).toBe(0);
    expect(projectLeadSourceEvidence({ lead_source_surface: "home_value_page" }).captureSurface.value).toBe("home_value_page");
  });
});
