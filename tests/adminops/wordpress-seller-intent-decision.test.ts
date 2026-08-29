import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWordPressSellerIntentDecisionManifest,
  loadWordPressSellerIntentDecisionManifest,
} from "../../app/lib/growth/wordpress-seller-intent-decision";
import type { WordPressPageIndexRow } from "../../app/lib/growth/wordpress-activation-change-set";

const GENERATED_AT = "2026-08-29T22:00:00.000Z";
const PAGE_ROWS: WordPressPageIndexRow[] = [
  {
    id: 3631,
    link: "https://www.ourtownproperties.com/we-buy-homes/",
    slug: "we-buy-homes",
    status: "publish",
    modified_gmt: "2026-06-03T18:00:00",
  },
  {
    id: 4364,
    link: "https://www.ourtownproperties.com/we-buy-houses/",
    slug: "we-buy-houses",
    status: "publish",
    modified_gmt: "2026-06-06T18:00:00",
  },
];

function pageHtml(input: {
  canonical: string;
  askMagicMikeHref?: string;
  nativeForm?: boolean;
  gravityFormId?: number;
  robots?: string;
  privateMarker?: string;
}) {
  return `<!doctype html><html><head>
    <link href="${input.canonical}" rel="canonical" />
    ${input.robots ? `<meta content="${input.robots}" name="robots" />` : ""}
  </head><body>
    ${input.askMagicMikeHref ? `<a href="${input.askMagicMikeHref}">Ask Mike</a>` : ""}
    ${input.nativeForm ? '<form class="amm-lead-form" id="amm-lead-form"><input name="private_name" /></form>' : ""}
    ${input.gravityFormId ? `<div id="gform_wrapper_${input.gravityFormId}"><form id="gform_${input.gravityFormId}"></form></div>` : ""}
    <script>window.privateMarker = "${input.privateMarker ?? "none"}";</script>
  </body></html>`;
}

function reviewedInput() {
  return {
    pageHtml: {
      we_buy_homes: pageHtml({
        canonical: "https://www.ourtownproperties.com/we-buy-homes/",
        askMagicMikeHref: "https://www.askmagicmike.com/value?utm_source=ourtownproperties",
        privateMarker: "252-243-7700",
      }),
      we_buy_houses: pageHtml({
        canonical: "https://www.ourtownproperties.com/we-buy-houses/",
        nativeForm: true,
        gravityFormId: 7,
        privateMarker: "private-form-copy-must-not-escape",
      }),
    },
    pageRows: PAGE_ROWS,
    generatedAt: GENERATED_AT,
  } as const;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WordPress seller-intent decision packet", () => {
  it("reports the reviewed duplicate SEO and capture state while withholding publication", () => {
    const manifest = buildWordPressSellerIntentDecisionManifest(reviewedInput());
    expect(manifest).toMatchObject({
      schemaVersion: "amm.wordpress_seller_intent_decision.v1",
      manifestKey: "wordpress_seller_intent_decision",
      generatedAt: GENERATED_AT,
      mode: "read_only_canonical_decision",
      status: "decision_required",
      publicationBlocked: true,
      publicationAuthorized: false,
      publicationGateIssued: false,
      decisionRequired: true,
      proposedCanonicalFunnel: "https://www.askmagicmike.com/sell",
      trackedPublicationHref: null,
      mutationPerformed: false,
      wordpressMutationPerformed: false,
      databaseMutationPerformed: false,
      leadSubmitted: false,
      notificationSent: false,
      containsRawPageHtml: false,
    });
    expect(manifest.requiredDecision).toEqual({
      canonicalSourcePage: null,
      captureOwner: null,
      duplicatePageDisposition: null,
      placementKey: null,
    });
    const homes = manifest.surfaces.find((surface) => surface.key === "we_buy_homes");
    const houses = manifest.surfaces.find((surface) => surface.key === "we_buy_houses");
    expect(homes).toMatchObject({
      pageId: 3631,
      pageIdMatches: true,
      selfCanonical: true,
      indexableCandidate: true,
      askMagicMikeHrefOccurrences: 1,
      captureSystems: ["canonical_app_link"],
    });
    expect(houses).toMatchObject({
      pageId: 4364,
      pageIdMatches: true,
      selfCanonical: true,
      indexableCandidate: true,
      askMagicMikeHrefOccurrences: 0,
      nativeLeadFormOccurrences: 1,
      gravityFormIds: [7],
      captureSystems: ["legacy_native_amm_form", "gravity_form_7"],
      captureSystemCount: 2,
    });
  });

  it("is deterministic, privacy-minimized, and sensitive to structural drift", () => {
    const first = buildWordPressSellerIntentDecisionManifest(reviewedInput());
    const second = buildWordPressSellerIntentDecisionManifest(reviewedInput());
    expect(first.evidenceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(second.evidenceSha256).toBe(first.evidenceSha256);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain("252-243-7700");
    expect(serialized).not.toContain("private-form-copy-must-not-escape");
    expect(serialized).not.toContain("<form");

    const drifted = buildWordPressSellerIntentDecisionManifest({
      ...reviewedInput(),
      pageHtml: {
        ...reviewedInput().pageHtml,
        we_buy_houses: pageHtml({
          canonical: "https://www.ourtownproperties.com/we-buy-houses/",
          nativeForm: true,
          gravityFormId: 7,
          robots: "noindex, follow",
        }),
      },
    });
    expect(drifted.status).toBe("reconciliation_required");
    expect(drifted.publicationBlocked).toBe(true);
    expect(drifted.evidenceSha256).not.toBe(first.evidenceSha256);
  });

  it("rejects lookalike Ask Magic Mike hrefs as structural drift", () => {
    const manifest = buildWordPressSellerIntentDecisionManifest({
      ...reviewedInput(),
      pageHtml: {
        ...reviewedInput().pageHtml,
        we_buy_homes: pageHtml({
          canonical: "https://www.ourtownproperties.com/we-buy-homes/",
          askMagicMikeHref: "https://askmagicmike.com.evil.example/value",
        }),
      },
    });
    const homes = manifest.surfaces.find((surface) => surface.key === "we_buy_homes");
    expect(homes).toMatchObject({
      askMagicMikeHrefOccurrences: 0,
      rejectedAskMagicMikeHrefOccurrences: 1,
    });
    expect(manifest.status).toBe("reconciliation_required");
    expect(manifest.publicationBlocked).toBe(true);
  });

  it("loads only the two allowlisted pages and public page index", async () => {
    const input = reviewedInput();
    const fetchMock = vi.fn(async (request: string | URL | Request) => {
      const url = String(request);
      if (url.includes("/wp-json/wp/v2/pages")) {
        return new Response(JSON.stringify(PAGE_ROWS), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/we-buy-homes/")) {
        return new Response(input.pageHtml.we_buy_homes, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (url.endsWith("/we-buy-houses/")) {
        return new Response(input.pageHtml.we_buy_houses, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const manifest = await loadWordPressSellerIntentDecisionManifest();
    expect(manifest.status).toBe("decision_required");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([request]) => String(request))).toEqual([
      "https://www.ourtownproperties.com/we-buy-homes/",
      "https://www.ourtownproperties.com/we-buy-houses/",
      expect.stringContaining("https://www.ourtownproperties.com/wp-json/wp/v2/pages"),
    ]);
  });

  it("fails closed if any public evidence read fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (request: string | URL | Request) => {
      const url = String(request);
      if (url.endsWith("/we-buy-houses/")) return new Response("unavailable", { status: 503 });
      if (url.includes("/wp-json/wp/v2/pages")) {
        return new Response(JSON.stringify(PAGE_ROWS), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(reviewedInput().pageHtml.we_buy_homes, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }));

    const manifest = await loadWordPressSellerIntentDecisionManifest();
    expect(manifest).toMatchObject({
      status: "fetch_failed",
      publicationBlocked: true,
      publicationAuthorized: false,
      surfaces: [],
      fetchErrorCodes: ["we_buy_houses_fetch_failed"],
    });
  });
});
