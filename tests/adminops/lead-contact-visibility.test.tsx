import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadQuickOverview } from "../../app/components/admin/LeadQuickOverview";
import { LeadContactDisclosure } from "../../app/components/admin/LeadContactDisclosure";
import { leadCardFixture } from "../../app/lib/leadPresentationFixtures";
import type { LeadPresentation } from "../../app/lib/leadPresentation";
import type { ManualContactReview } from "../../app/lib/manualContactReview";

const id = "00000000-0000-4000-8000-000000000002";
function view(tier: LeadPresentation["disclosure"] = "assigned") {
  const result = leadCardFixture({ subtype: "seller", tier, state: "offered", score: 60, isTest: false });
  if (result.identity) result.identity = { ...result.identity, phone: "+1 (202) 555-0199", email: "synthetic@example.test" };
  return result;
}
function overview(value = view(), canReview = false, blocked = true) {
  return <LeadQuickOverview view={value} leadId={id} receivedAt="2026-10-10T12:00:00Z" request="Home value request" blocked={blocked} canReview={canReview} status="assigned"/>;
}
const permitted: ManualContactReview = { ok: true, lead: { isTest: false, suppressed: false },
  manualContact: { canReview: true, terminal: false, phone: "+12025550199", email: "synthetic@example.test" },
  reviewMatrix: ["phone", "email"].map(channel => ({ channel, purpose: "manual_one_to_one", decision: { allowed: false, code: "human_approval_required", requiresHumanApproval: true } })) };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("server-authorized saved contact visibility", () => {
  it.each(["assigned", "supervisor"] as const)("shows selectable plain text for %s independently of review/contact eligibility", tier => {
    const html = renderToStaticMarkup(overview(view(tier)));
    expect(html).toContain("+1 (202) 555-0199"); expect(html).toContain("synthetic@example.test");
    expect(html).toContain("select-text"); expect(html.indexOf("Saved contact details")).toBeLessThan(html.indexOf(">Area<"));
    expect(html).not.toMatch(/href="(?:tel|mailto|sms):/);
    expect(html).toContain("Contact blocked");
  });
  it.each(["pre_claim", "audit"] as const)("does not disclose a malformed %s DTO's identity", tier => {
    const malformed = { ...view(tier), identity: view().identity };
    const html = renderToStaticMarkup(overview(malformed));
    expect(html).not.toContain("synthetic@example.test"); expect(html).not.toContain("+1 (202) 555-0199");
    expect(html).not.toContain("Please review the appropriate evidence"); expect(html).not.toContain("Saved contact details");
  });
  it("does not create a contact block without the authorized identity", () => {
    const value = view(); delete value.identity;
    expect(renderToStaticMarkup(overview(value))).not.toContain("Saved contact details");
  });
  it("labels missing values without inferring contact details", () => {
    const value = view(); value.identity = { ...value.identity!, phone: null, email: "   " };
    const html = renderToStaticMarkup(overview(value));
    expect(html.match(/Not provided/g)).toHaveLength(2); expect(html).not.toContain("synthetic@example.test");
  });
  it("escapes long/untrusted values and retains their complete selectable text", () => {
    const value = view(); const email = `${"long".repeat(100)}<script>alert(1)</script>@example.test`;
    value.identity = { ...value.identity!, email };
    const html = renderToStaticMarkup(overview(value));
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>"); expect(html).toContain("overflow-wrap:anywhere");
  });
  it("still shows QA values while all contact controls are held", () => {
    const value = view(); value.isTest = true;
    const html = renderToStaticMarkup(overview(value));
    expect(html).toContain("TEST — DO NOT CONTACT"); expect(html).toContain("synthetic@example.test");
    expect(html).not.toContain("Review &amp; call");
  });
});

describe("fresh contact access denial (component-only synthetic fetches, not auth proof)", () => {
  it("clears the whole authorized workspace, including contact details outside the overview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(permitted)).mockResolvedValueOnce(new Response(null, { status: 404 })));
    render(<LeadContactDisclosure leadId={id}><div>Secondary saved contact</div>{overview(view(), true, false)}</LeadContactDisclosure>);
    const call = screen.getByRole("button", { name: "Review & call" });
    await waitFor(() => expect(call).toBeEnabled()); fireEvent.click(call); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Open dialer" }));
    await screen.findByRole("status", { name: "Lead access unavailable" });
    expect(screen.queryByText("Secondary saved contact")).not.toBeInTheDocument();
  });
  it.each([401, 403, 404])("removes contacts and pending action on refreshed %s", async status => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(permitted)).mockResolvedValueOnce(new Response(null, { status }));
    vi.stubGlobal("fetch", fetch);
    render(overview(view(), true, false));
    const call = screen.getByRole("button", { name: "Review & call" });
    await waitFor(() => expect(call).toBeEnabled()); fireEvent.click(call);
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Open dialer" }));
    await screen.findByRole("status", { name: "Lead access unavailable" });
    expect(screen.queryByText("synthetic@example.test")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open dialer" })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("a provider/permission read failure clears the choice, not the authorized saved details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(permitted)).mockResolvedValueOnce(new Response(null, { status: 503 })));
    render(overview(view(), true, false));
    const call = screen.getByRole("button", { name: "Review & call" });
    await waitFor(() => expect(call).toBeEnabled()); fireEvent.click(call); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Open dialer" }));
    await screen.findByText("Contact permission could not be verified. Nothing was opened.");
    expect(screen.queryByRole("button", { name: "Open dialer" })).not.toBeInTheDocument();
    expect(screen.getByText("synthetic@example.test")).toBeVisible();
  });
  it("a changed exact contact target requires a new review rather than launching the replacement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(permitted)).mockResolvedValueOnce(Response.json({ ...permitted, manualContact: { ...permitted.manualContact!, phone: "+12025550198" } })));
    render(overview(view(), true, false));
    const call = screen.getByRole("button", { name: "Review & call" });
    await waitFor(() => expect(call).toBeEnabled()); fireEvent.click(call); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Open dialer" }));
    await screen.findByText("Permission changed or is unavailable. No contact action was opened.");
    expect(screen.queryByRole("button", { name: "Open dialer" })).not.toBeInTheDocument();
  });
});
