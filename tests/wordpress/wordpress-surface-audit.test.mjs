import { describe, expect, it } from "vitest";
import {
  inspectWordPressPage,
  normalizeWordPressAuditUrl,
  parseWordPressSitemap,
  summarizeWordPressSurface,
} from "../../scripts/amm/wordpress-surface-audit-lib.mjs";

const PAGE = `<!doctype html>
<html>
  <head>
    <title>Home Value &amp; Local Review</title>
    <link href="https://www.ourtownproperties.com/home-value/" rel="canonical">
    <meta content="index,follow" name="robots">
  </head>
  <body>
    <form class="amm-lead-form" data-amm-form>
      <input name="property_address">
      <input name="email" type="email">
      <p class="amm-privacy">By submitting, you agree that Our Town Properties may contact you.</p>
    </form>
    <div id="gform_wrapper_7"><form id="gform_7" data-formid="7"></form></div>
    <div class="amm-embed" data-utm-source="ourtownproperties" data-utm-medium="owned_media" data-utm-campaign="amm_owned_demand_2026"></div>
    <script src="https://www.askmagicmike.com/embed/amm-loader.js"></script>
    <script src="/wp-content/plugins/ask-magic-mike/public/js/amm-forms.js"></script>
    <script>window.AMMConfig={nonce:"must-not-leak"}</script>
    <a href="https://www.askmagicmike.com/home-value?utm_source=ourtownproperties&#038;utm_medium=owned_media&#038;utm_campaign=amm_owned_demand_2026">Review</a>
    <a href="tel:1-252-243-7700">Call</a>
  </body>
</html>`;

describe("WordPress public-surface audit", () => {
  it("allows only exact Our Town HTTPS audit targets", () => {
    expect(normalizeWordPressAuditUrl("https://www.ourtownproperties.com/page-sitemap.xml#top"))
      .toBe("https://www.ourtownproperties.com/page-sitemap.xml");
    expect(() => normalizeWordPressAuditUrl("https://evil.example/ourtownproperties.com"))
      .toThrow(/outside the exact approved HTTPS hosts/);
    expect(() => normalizeWordPressAuditUrl("http://127.0.0.1:3000/private"))
      .toThrow(/outside the exact approved HTTPS hosts/);
  });

  it("parses sitemap locations without duplicates", () => {
    expect(parseWordPressSitemap(`
      <urlset>
        <url><loc>https://www.ourtownproperties.com/home-value/</loc></url>
        <url><loc>https://www.ourtownproperties.com/home-value/</loc></url>
        <url><loc>https://www.ourtownproperties.com/ask-magic-mike/</loc></url>
      </urlset>
    `)).toEqual([
      "https://www.ourtownproperties.com/ask-magic-mike/",
      "https://www.ourtownproperties.com/home-value/",
    ]);
  });

  it("extracts only privacy-safe structural evidence", () => {
    const page = inspectWordPressPage(PAGE, "https://www.ourtownproperties.com/home-value/");
    expect(page.title).toBe("Home Value & Local Review");
    expect(page.canonical).toBe("https://www.ourtownproperties.com/home-value/");
    expect(page.indexable).toBe(true);
    expect(page.gravity_form_ids).toEqual([7]);
    expect(page.native_amm_lead_form).toEqual({
      count: 1,
      field_names: ["email", "property_address"],
      consent_texts: ["By submitting, you agree that Our Town Properties may contact you."],
      has_explicit_consent_control: false,
    });
    expect(page.canonical_embed).toMatchObject({
      present: true,
      loader_present: true,
      utm_source: "ourtownproperties",
      utm_content: null,
    });
    expect(page.canonical_app_links[0]).toMatchObject({
      path: "/home-value",
      utm_source: "ourtownproperties",
      utm_medium: "owned_media",
      utm_campaign: "amm_owned_demand_2026",
      utm_content: null,
    });
    expect(page.plugin_assets).toEqual(["ask-magic-mike"]);
    expect(page.telephone_targets).toEqual(["12522437700"]);
    expect(JSON.stringify(page)).not.toContain("must-not-leak");
  });

  it("flags indexable duplicates, legacy capture, incomplete UTMs, and forms outside the supplied bridge allowlist", () => {
    const homeValue = inspectWordPressPage(PAGE, "https://www.ourtownproperties.com/home-value/");
    const evaluation = inspectWordPressPage(
      PAGE.replaceAll("/home-value/", "/home-evaluation/"),
      "https://www.ourtownproperties.com/home-evaluation/",
    );
    const summary = summarizeWordPressSurface([homeValue, evaluation], [3]);
    expect(summary.duplicate_route_clusters.find((row) => row.key === "seller_value")?.indexable_count).toBe(2);
    expect(summary.risk_flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "multiple_indexable_intent_pages" }),
      expect.objectContaining({ code: "legacy_native_capture_still_public" }),
      expect.objectContaining({ code: "multiple_capture_systems_on_same_page" }),
      expect.objectContaining({ code: "canonical_link_missing_complete_utm" }),
      expect.objectContaining({ code: "canonical_embed_missing_placement_utm" }),
      expect.objectContaining({ code: "gravity_forms_outside_configured_canonical_allowlist" }),
    ]));
  });

  it("separates a repeated sitewide Gravity form from an enabled intent form", () => {
    const makePage = (path, extraForm = "") => inspectWordPressPage(`
      <!doctype html>
      <html>
        <head><title>${path}</title><link rel="canonical" href="https://www.ourtownproperties.com${path}"></head>
        <body>
          <div id="gform_wrapper_7"><form id="gform_7" data-formid="7"></form></div>
          ${extraForm}
        </body>
      </html>
    `, `https://www.ourtownproperties.com${path}`);

    const summary = summarizeWordPressSurface([
      makePage("/", '<div id="gform_wrapper_3"><form id="gform_3" data-formid="3"></form></div>'),
      makePage("/agents/mike-eatmon/"),
      makePage("/rentals/"),
      makePage("/ask-magic-mike/"),
    ], [3]);

    expect(summary.canonical_capture_coverage).toEqual({
      comparison_supplied: true,
      sitewide_placement_threshold: 3,
      forms: [
        {
          form_id: 3,
          placement_count: 1,
          placement_share: 0.25,
          repeated_sitewide: false,
          configured_for_canonical_forwarding: true,
          coverage_state: "configured_for_canonical_forwarding",
        },
        {
          form_id: 7,
          placement_count: 4,
          placement_share: 1,
          repeated_sitewide: true,
          configured_for_canonical_forwarding: false,
          coverage_state: "observed_outside_configured_allowlist",
        },
      ],
    });
    expect(summary.risk_flags).toContainEqual({
      code: "sitewide_gravity_form_outside_configured_canonical_allowlist",
      forms: [{ form_id: 7, placement_count: 4, placement_share: 1 }],
    });
  });
});
