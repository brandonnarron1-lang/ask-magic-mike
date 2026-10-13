import { describe, expect, it } from "vitest";
import { widgetFullFormQuery } from "../../app/lib/widgetFullForm";

describe("widget full-form public fallback", () => {
  it("preserves independently named source/medium/campaign/placement codes", () => {
    const result = new URLSearchParams(widgetFullFormQuery("?source=ourtownproperties&medium=owned_media&campaign=amm_owned_demand_2026&placement=wordpress_listing_buyer"));
    expect(Object.fromEntries(result)).toEqual({ utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026", utm_content: "wordpress_listing_buyer" });
  });
  it("uses canonical UTM claims over legacy aliases", () => {
    const result = new URLSearchParams(widgetFullFormQuery("?source=old&utm_source=facebook&utm_medium=organic_social&utm_campaign=amm_seller_buyer_launch_2026&utm_content=seller_facebook&placement=old"));
    expect(result.get("utm_source")).toBe("facebook");
    expect(result.get("utm_content")).toBe("seller_facebook");
  });
  it("does not forward contact, property, parent path or agent claims", () => {
    const result = widgetFullFormQuery("?email=private%40example.test&phone=2025550199&parent_url=https%3A%2F%2Fparent.example.test%2Fprivate&property_id=secret&agent_id=agent&utm_source=https%3A%2F%2Fprivate.example.test%2F");
    for (const value of ["private", "2025550199", "property_id", "agent_id", "parent_url"]) expect(result).not.toContain(value);
  });
  it("provides a deterministic embed fallback when storage and lookup are absent", () => {
    expect(new URLSearchParams(widgetFullFormQuery("")).get("utm_medium")).toBe("embed");
  });
  it("rejects phone/name-like tracking strings rather than inferring public codes", () => {
    expect(widgetFullFormQuery("?utm_source=2025550199&utm_campaign=Mike+Eatmon&utm_content=private_note")).not.toMatch(/2025550199|Mike|private_note/);
  });
});
