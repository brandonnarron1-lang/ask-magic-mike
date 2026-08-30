import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WORDPRESS_HOMEPAGE_CTA_HIDE_RULE,
  loadWordPressHomepagePreview,
  transformHomepageForCtaPreview,
} from "../../scripts/amm/wordpress-homepage-cta-local-preview.mjs";

const SOURCE = `<!doctype html><html><head>
  <style>${WORDPRESS_HOMEPAGE_CTA_HIDE_RULE}</style>
  <script src="https://analytics.example/tracker.js"></script>
</head><body>
  <div class="amm-cta amm-cta--dark"><a href="https://www.askmagicmike.com/value">Start With Your Address</a></div>
  <form action="https://collector.example"><input name="email"></form>
  <iframe src="https://tracker.example"></iframe>
  <noscript><img src="https://tracker.example/pixel"></noscript>
</body></html>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WordPress homepage CTA local visual preview", () => {
  it("removes only the reviewed hide rule and disables active content", () => {
    const preview = transformHomepageForCtaPreview(SOURCE);
    expect(preview.facts).toMatchObject({
      hideRuleOccurrences: 1,
      remainingHideRuleOccurrences: 0,
      scriptOccurrences: 1,
      remainingScriptOccurrences: 0,
      iframeOccurrences: 1,
      remainingIframeOccurrences: 0,
      formActionsBlockedByCsp: true,
      networkConnectionsBlockedByCsp: true,
      externalScriptsBlockedByCsp: true,
    });
    expect(preview.html).toContain("Start With Your Address");
    expect(preview.html).toContain("<base href=\"https://www.ourtownproperties.com/\">");
    expect(preview.html).toContain("form-action 'none'");
    expect(preview.html).not.toContain(WORDPRESS_HOMEPAGE_CTA_HIDE_RULE);
    expect(preview.html).not.toMatch(/<script\b|<iframe\b|<noscript\b/i);
  });

  it("fails closed when source visibility evidence drifts", () => {
    expect(() => transformHomepageForCtaPreview(
      SOURCE.replace(WORDPRESS_HOMEPAGE_CTA_HIDE_RULE, ""),
    )).toThrow("wordpress_homepage_preview_hide_rule_precondition_failed");
    expect(() => transformHomepageForCtaPreview(
      SOURCE.replace(
        WORDPRESS_HOMEPAGE_CTA_HIDE_RULE,
        `${WORDPRESS_HOMEPAGE_CTA_HIDE_RULE}${WORDPRESS_HOMEPAGE_CTA_HIDE_RULE}`,
      ),
    )).toThrow("wordpress_homepage_preview_hide_rule_precondition_failed");
  });

  it("accepts only a direct HTML success from the exact public source", async () => {
    const fetchMock = vi.fn(async () => new Response(SOURCE, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadWordPressHomepagePreview()).resolves.toMatchObject({
      facts: { hideRuleOccurrences: 1 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.ourtownproperties.com/",
      expect.objectContaining({ redirect: "manual" }),
    );

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    })));
    await expect(loadWordPressHomepagePreview()).rejects.toThrow(
      "wordpress_homepage_preview_fetch_failed_200",
    );
  });
});
