import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { experienceContract } from "../../app/lib/experienceContract";
import { wordpressTrackedChoices, WORDPRESS_ACQUISITION_GROUPS } from "../../app/lib/growth/wordpress-placement-catalog";
import { guestInterest } from "../../app/lib/consumerInterests";
import { readExperience } from "../../app/lib/client/experienceClient";
import { GET } from "../../app/api/experience/v1/route";
import { isExternalAnalyticsEligibleContext } from "../../app/lib/externalAnalytics";

describe("versioned public experience, old consumers unchanged", () => {
  it("retains five exact choices in three tracking cohorts", () => {
    expect(WORDPRESS_ACQUISITION_GROUPS.map(group => group.key)).toEqual(experienceContract.tracking.groups);
    expect(WORDPRESS_ACQUISITION_GROUPS.flatMap(group => group.destinations)).toEqual(["/home-value", "/buy", "/sell?seller_option=compare", "/sell?seller_option=compare", "/buy"]);
    for (const group of WORDPRESS_ACQUISITION_GROUPS) for (const choice of wordpressTrackedChoices(group.key)) {
      const url = new URL(choice.trackedUrl);
      expect(url.origin).toBe("https://www.askmagicmike.com");
      expect(url.searchParams.get("utm_medium")).toBe("owned_media");
      expect(url.searchParams.get("utm_content")).toBe(group.key);
    }
  });
  it("retains accepted public and connector contracts without a remote config dependency", () => {
    expect(experienceContract.compatibility.publicIntake).toBe("/api/leads");
    expect(experienceContract.compatibility.widget).toBe("/widget/v1");
    const connector = JSON.parse(readFileSync("wordpress/ask-magic-mike-connector/placement-contracts.json", "utf8"));
    expect(connector.canonical_base_url).toBe(experienceContract.canonicalOrigin);
    expect(connector.seller_options_extension.values).toEqual(experienceContract.compatibility.sellerOptions);
    expect(connector.seller_options_extension.routes).toEqual(experienceContract.compatibility.sellerOptionRoutes);
    expect(readFileSync("scripts/amm/generate-launch-kit.mjs", "utf8")).toContain("experience.offers[");
  });
  it("returns only the public versioned contract, without a session or customer query", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual(experienceContract);
    expect(JSON.stringify(experienceContract)).not.toMatch(/@|postgres|recipient|token|session_id|lead_id|assigned_agent_id/);
  });
  it("uses no credentials, no redirects, and rejects incompatible network contracts", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(experienceContract), {headers:{"content-type":"application/json"}}));
    expect(await readExperience(fetcher)).toEqual(experienceContract);
    expect(fetcher).toHaveBeenCalledWith("/api/experience/v1", expect.objectContaining({credentials:"omit",redirect:"error",referrerPolicy:"no-referrer"}));
    fetcher.mockResolvedValue(new Response(JSON.stringify({...experienceContract,canonicalOrigin:"https://untrusted.example"}), {headers:{"content-type":"application/json"}}));
    await expect(readExperience(fetcher)).rejects.toThrow("experience_version_mismatch");
  });
  it("excludes the private guest workspace from external analytics", () => {
    expect(isExternalAnalyticsEligibleContext({hostname:"www.askmagicmike.com",pathname:"/my",search:"",webdriver:false})).toBe(false);
  });
});

describe("in-memory declared interests, not another lead store", () => {
  it("keeps reference and search evidence distinct and unverified", () => {
    expect(guestInterest({kind:"property",value:"123 Synthetic Lane",budget:""},"a")).toEqual({id:"a",label:"123 Synthetic Lane",provenance:"user_reported_unverified",declared:{version:1,kind:"specific",properties:[{address_text:"123 Synthetic Lane"}]}});
    expect(guestInterest({kind:"search",value:"Wilson",budget:"Under $300,000"},"b").declared).toEqual({version:1,kind:"search",desired_area:"Wilson",budget_range:"Under $300,000"});
  });
  it("retains a listing reference without fetching or asserting availability", () => {
    expect(guestInterest({kind:"property",value:"https://example.test/listing",budget:""},"a").declared).toEqual({version:1,kind:"specific",properties:[{listing_url:"https://example.test/listing"}]});
  });
  it.each(["javascript:alert(1)","//example.test/path","https://user:password@example.test","https://example.test/with space","", "x".repeat(501),"line\nbreak"])("rejects unsafe or excessive reference %s", value => {
    expect(() => guestInterest({kind:"property",value,budget:""},"a")).toThrow();
  });
  it("keeps contact, consent, assignment and outcomes out of saved-interest evidence", () => {
    expect(Object.keys(guestInterest({kind:"search",value:"Wilson",budget:""},"a")).sort()).toEqual(["declared","id","label","provenance"]);
    expect(() => guestInterest({kind:"search",value:"Wilson",budget:"x".repeat(161)},"a")).toThrow();
  });
});
