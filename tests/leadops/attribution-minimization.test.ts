import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanAttribution, normalizeLeadPayload } from "../../app/lib/leadPayload";
import { readAttribution } from "../../app/lib/attribution";

const campaign = { source: "ourtownproperties", medium: "owned_media", campaign: "amm_owned_demand_2026", content: "wordpress_home_value_page" };
const tainted = "https://user:password@www.ourtownproperties.com/how-much-is-your-home-worth/?email=synthetic%40example.test&redirect=https%253A%252F%252Fexample.test%252Fsecret#private";
beforeEach(() => { window.sessionStorage.clear(); vi.stubGlobal("matchMedia", () => ({ matches: false })); });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; window.sessionStorage.clear(); });

describe("public attribution minimization at real boundaries", () => {
  it("normalizes parent/referrer/landing and snapshots, not only the top-level page URL", () => {
    const value = cleanAttribution({ ...campaign, parent_url: tainted, referrer: tainted,
      landing_page: "https://www.askmagicmike.com/home-value?email=synthetic%40example.test#secret",
      current_path: "/admin/leads/private-person", first_touch: { ...campaign, parent_url: tainted },
      last_touch: { content: "synthetic@example.test", current_path: "/homes/123-private-address" },
      gclid: "secret", page_title: "Synthetic Person at a private address", agent_id: "person@example.test" });
    expect(value).toMatchObject({ ...campaign, parent_url: "https://www.ourtownproperties.com/how-much-is-your-home-worth/", landing_page: "https://www.askmagicmike.com/home-value" });
    expect(value.current_path).toBeUndefined();
    for (const secret of ["password", "synthetic@", "secret", "private-person", "private-address", "Synthetic Person"]) expect(JSON.stringify(value)).not.toContain(secret);
    expect(value.gclid).toBeUndefined(); expect(value.page_title).toBeUndefined(); expect(value.agent_id).toBeUndefined();
  });
  it("drops unregistered campaign claims, encoded/nested paths and unsafe schemes", () => {
    for (const value of ["SarahJohnson", "123-main-street", "person@example.test", "https%253A%252F%252Fexample.test", "x".repeat(10000)]) {
      const result = cleanAttribution({ source: value, medium: value, campaign: value, content: value, placement_id: value });
      expect(Object.values(result).filter(value => typeof value === "string")).toHaveLength(0);
      expect(result.first_touch).toEqual({}); expect(result.last_touch).toEqual({});
    }
    for (const value of ["javascript:alert(1)", "https://www.ourtownproperties.com/%252Fperson%2540example.test", "https://private-person.example.test/address", "//evil.test/private"]) {
      expect(cleanAttribution({ parent_url: value }).parent_url).toBeUndefined();
    }
    expect(normalizeLeadPayload({ page_url: tainted, attribution: campaign }).page_url).toBe("https://www.ourtownproperties.com/how-much-is-your-home-worth/");
  });
  it("sanitizes historical session input without inventing earlier touch evidence", () => {
    window.sessionStorage.setItem("amm_attribution", JSON.stringify({ ...campaign, parent_url: tainted, first_touch: { source: "not-established", landing_page: tainted } }));
    const result = readAttribution({ parent_url: tainted, page_title: "PRIVATE", content: "synthetic@example.test" });
    expect(result.first_touch?.source).toBeUndefined();
    expect(result.first_touch?.landing_page).toBe("https://www.ourtownproperties.com/how-much-is-your-home-worth/");
    expect(JSON.stringify(result)).not.toMatch(/password|PRIVATE|synthetic@|redirect=/);
    expect(window.sessionStorage.getItem("amm_attribution")).not.toMatch(/password|PRIVATE|synthetic@|redirect=/);
  });
  it("the shipped loader never transports raw parent queries, titles or referrers", () => {
    const script = document.createElement("script"); script.src = "https://www.askmagicmike.com/widget.js"; script.dataset.autoInit = "false";
    Object.defineProperty(document, "currentScript", { configurable: true, value: script });
    Object.defineProperty(document, "referrer", { configurable: true, value: tainted });
    const location = { href: tainted, search: new URL(tainted).search, hostname: "www.ourtownproperties.com" };
    const fakeWindow = { location, matchMedia: () => ({ matches: false }), addEventListener() {}, dispatchEvent() {} };
    new Function("window", "document", readFileSync("public/widget.js", "utf8"))(fakeWindow, document);
    (fakeWindow as unknown as { AskMagicMikeWidget: { init: (options: object) => void } }).AskMagicMikeWidget.init({ ...campaign, placement: "home-value-page" });
    const src = new URL(document.querySelector("iframe")!.src);
    expect(document.querySelector("iframe")!.referrerPolicy).toBe("no-referrer");
    expect(src.pathname).toBe("/widget/v1");
    expect(src.searchParams.get("parent_url")).toBe("https://www.ourtownproperties.com/how-much-is-your-home-worth/");
    expect(decodeURIComponent(src.toString())).not.toMatch(/password|synthetic@|redirect=|page_title|gclid|#private/);
    expect(src.searchParams.get("source")).toBe("ourtownproperties");
  });
});
