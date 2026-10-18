// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createGuestExperienceClient, emptyGuestClientState, saveGuestDraft } from "../../app/lib/client/guestExperienceClient";
import { experienceContract } from "../../app/lib/experienceContract";
import { answerFromApprovedSources } from "../../src/lib/intelligence/public-knowledge";
import { reviewedFortnightExport, reviewedLaunchWorkItem } from "../../src/lib/content/reviewed-launch-work-item";

describe("independent R3 public client / existing-kit marketing preparation, not native beta", () => {
  it("reads the bundled contract and cited guidance with no staff/account credentials", async () => {
    const reply = answerFromApprovedSources("buy a home", { now: new Date("2026-10-18T00:00:00Z") });
    const transport = vi.fn(async (input: RequestInfo | URL) => Response.json(String(input).endsWith("/api/experience/v1") ? experienceContract : reply));
    const client = createGuestExperienceClient(transport);
    expect(await client.contract()).toEqual(experienceContract); expect(await client.ask("buy a home")).toEqual(reply);
    for(const [url,init] of transport.mock.calls as unknown as [string,RequestInit][]) {
      expect(url.startsWith("https://www.askmagicmike.com/api/")).toBe(true); expect(init.credentials).toBe("omit"); expect(init.redirect).toBe("error");
      expect(JSON.stringify(init)).not.toMatch(/Bearer|Cookie|\/api\/leads/);
    }
  });
  it("surfaces permission/provider failure and refuses malicious citation links", async () => {
    await expect(createGuestExperienceClient(vi.fn(async()=>new Response(null,{status:403}))).ask("buy a home")).rejects.toThrow("guidance_unavailable");
    const reply = answerFromApprovedSources("buy a home", { now: new Date("2026-10-18T00:00:00Z") });
    reply.citations[0].url = "https://untrusted.example";
    await expect(createGuestExperienceClient(vi.fn(async()=>Response.json(reply))).ask("buy a home")).rejects.toThrow("guidance_citation_invalid");
    expect(()=>createGuestExperienceClient(vi.fn(),"https://untrusted.example")).toThrow("canonical_public_origin_required");
  });
  it("edits local unverified interests without creating or replaying an inquiry", () => {
    const id=randomUUID(); const first=saveGuestDraft(emptyGuestClientState(),{id,kind:"search",value:"Wilson, NC",budget:""});
    const edited=saveGuestDraft(first,{id,kind:"search",value:"Wilson and Elm City",budget:"User-declared"});
    expect(edited.interests).toHaveLength(1); expect(edited.submission).toBe("NOT_SUBMITTED");
    expect(edited.interests[0].provenance).toBe("user_reported_unverified"); expect(first.interests[0].label).toBe("Wilson, NC");
  });
  it("exports fourteen staged items from the existing assets without implying publication or scheduling", () => {
    const items = reviewedFortnightExport(); expect(items).toHaveLength(14);
    for(const item of items) { expect(item.status).toBe("DRAFT_REVIEW_REQUIRED_NOT_PUBLISHED"); expect(item.publication).toEqual({permalink:null,publishedAt:null});
      expect(item.assetHash).toMatch(/^[a-f0-9]{64}$/); expect(item.sends).toBe(0); expect(item.customerDataIncluded).toBe(false);
      expect(item.caption).not.toMatch(/guaranteed|instant valuation promised|\/admin\/|INTERNAL QA/); }
    expect(reviewedLaunchWorkItem("buyer","instagram").linkInstruction).toContain("not a clickable-link proof");
  });
});
