import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadQualificationPanel } from "../../app/components/admin/LeadQualificationPanel";
import { normalizeAdminLeadRow } from "../../app/lib/persistence/supabase/adminLeadView";
import { buildLeadQualificationDossier } from "../../app/lib/leadQualificationDossier";
import { simulateAllocation } from "../../app/lib/allocationReadiness";
const dossier = buildLeadQualificationDossier(normalizeAdminLeadRow({ id: "synthetic-inquiry", created_at: "2026-10-27T12:00:00Z", lead_type: "buyer", address: "<script>alert('synthetic')</script>", phone: "+12025550199", email: "hidden@example.test" }));
describe("compact factual review panel (render evidence, not session proof)", () => {
  it("uses escaped retained facts and existing next-step anchors, with no contact URI or form", () => {
    const html = renderToStaticMarkup(<LeadQualificationPanel dossier={dossier} simulation={null}/>);
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
    expect(html).toContain('href="#follow-up"'); expect(html).toContain('href="/admin/today"');
    expect(html).not.toMatch(/<form|tel:|mailto:|sms:|hidden@example.test|12025550199/);
    expect(html).toContain("not a sent message"); expect(html).toContain("Not recorded");
    expect(html).toContain("min-h-11"); expect(html).toContain("overflow-wrap:anywhere");
  });
  it("keeps administrator pool explanation absent for the assigned-agent view", () => {
    const html = renderToStaticMarkup(<LeadQualificationPanel dossier={dossier} simulation={null}/>);
    expect(html).not.toContain("Agent-by-agent"); expect(html).toContain("authorized administrator");
  });
  it("shows the actual held snapshot rather than an activation control or a fake agent", () => {
    const simulation = simulateAllocation({ inquiry: { id: dossier.inquiryId, intent: "buyer", region: null, locality: null, responsibleOwnerId: "mike", inheritedOwner: true, representation: "unknown", requestedAgentId: null, relationshipAgentId: null, contactHeld: false }, roster: [], at: "2026-10-27T12:00:00Z", policyVersion: 1 });
    const html = renderToStaticMarkup(<LeadQualificationPanel dossier={dossier} simulation={simulation}/>);
    expect(html).toContain("HELD"); expect(html).toContain("effects: "); expect(html).toContain("NONE");
    expect(html).toContain("not proof that no agents exist"); expect(html).not.toContain("Activate");
  });
});
