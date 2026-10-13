import { afterEach, describe, expect, it, vi } from "vitest";
import { LIVE_HOME_VALUE_URL } from "../../app/components/black-diamond/IntakeModeNotice";
import { resolveOwnedDemandPlacement } from "../../app/lib/growth/owned-demand";
import { buildUtmUrl } from "../../src/lib/admin/utm-link-builder";
import nextConfig from "../../next.config";

afterEach(() => vi.unstubAllEnvs());

describe("Home Value consumer handoff, not a design Preview link", () => {
  it.each(["synthetic-review.vercel.app", "attacker.invalid"])("does not derive live intake from %s", (host) => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", host);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", `https://${host}`);
    expect(LIVE_HOME_VALUE_URL).toBe("https://www.askmagicmike.com/home-value");
    const placement = resolveOwnedDemandPlacement("ourtown_wordpress", "wordpress_home_value")!;
    expect(placement).not.toBeNull();
    const destination = new URL(placement.trackedUrl);
    expect(destination.origin).toBe("https://www.askmagicmike.com");
    expect(destination.pathname).toBe("/home-value");
    expect(destination.searchParams.get("utm_medium")).toBe("owned_media");
    expect(destination.searchParams.get("utm_content")).toBe("wordpress_home_value_page");
    expect(destination.searchParams.has("email")).toBe(false);
  });

  it("rejects generated-host consumer campaign links while preserving the existing allowlist", () => {
    const utm = {utm_source:"ourtownproperties",utm_medium:"owned_media" as const,utm_campaign:"amm_owned_demand_2026",utm_content:"wordpress_home_value_page"};
    expect(() => buildUtmUrl("https://synthetic-review.vercel.app/home-value",utm)).toThrow();
    expect(new URL(buildUtmUrl(LIVE_HOME_VALUE_URL,utm)).origin).toBe("https://www.askmagicmike.com");
  });

  it("declares the existing permanent relative redirect without substituting a Preview host", async () => {
    expect(await nextConfig.redirects!()).toContainEqual({source:"/value",destination:"/home-value",permanent:true});
  });
});
