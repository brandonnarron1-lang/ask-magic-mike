import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadQuickOverview } from "../../app/components/admin/LeadQuickOverview";
import { leadCardFixture } from "../../app/lib/leadPresentationFixtures";
import type { LeadPresentation } from "../../app/lib/leadPresentation";

const interest = { version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Property Road", unit: "2B", listing_url: "https://listing.example.test/untrusted-reference" }] } as const;
function markup(view: LeadPresentation) { return renderToStaticMarkup(<LeadQuickOverview view={view} leadId="00000000-0000-4000-8000-000000000002" receivedAt={null} request="Buyer request" blocked canReview={false} status="new"/>); }
function fixture() { return leadCardFixture({ subtype: "buyer", tier: "assigned", state: "offered", score: 60, isTest: true }); }
describe("authorized latest-inquiry property disclosure", () => {
  it("shows structured interest next to the submitted contacts even when communication is blocked", () => {
    const view = fixture(); view.identity = { ...view.identity!, buyerInterest: { ...interest, properties: [...interest.properties] } };
    const html = markup(view);
    expect(html).toContain("Submitted buying interest"); expect(html).toContain(interest.properties[0].address_text); expect(html).toContain("2B");
    expect(html).toContain("reference only"); expect(html).not.toContain(`href="${interest.properties[0].listing_url}`);
    expect(html.indexOf("Submitted buying interest")).toBeLessThan(html.indexOf("Assignment"));
  });
  it.each(["pre_claim", "audit"] as const)("does not serialize/render interest injected into a malformed %s DTO", disclosure => {
    const view = fixture(); view.disclosure = disclosure; view.identity = { ...view.identity!, buyerInterest: { ...interest, properties: [...interest.properties] } };
    const html = markup(view); for (const value of [interest.properties[0].address_text, interest.properties[0].listing_url, "2B"]) expect(html).not.toContain(value);
  });
  it("keeps search area and self-reported budget separate from a property address", () => {
    const view = fixture(); view.identity = { ...view.identity!, buyerInterest: { version: 1, kind: "search", desired_area: "Synthetic Wilson area", budget_range: "Synthetic planning range" } };
    const html = markup(view); expect(html).toContain("Desired area"); expect(html).toContain("Submitted budget range"); expect(html).not.toContain("Property address");
  });
});
