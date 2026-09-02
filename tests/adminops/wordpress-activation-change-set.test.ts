import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildWordPressActivationChangeSet,
  loadWordPressActivationChangeSet,
  loadWordPressActivationChangeSets,
  normalizeWordPressActivationUrl,
  toOwnedDemandPlacementReadiness,
  WORDPRESS_CONNECTOR_REQUIRED_VERSION,
  WORDPRESS_CONNECTOR_UPGRADE_APPROVAL_GATE,
  type WordPressPageIndexRow,
} from "../../app/lib/growth/wordpress-activation-change-set";

const GENERATED_AT = "2026-08-22T21:30:00.000Z";
const HOME_ROW: WordPressPageIndexRow = {
  id: 149,
  link: "https://www.ourtownproperties.com/",
  slug: "home",
  status: "publish",
  modified_gmt: "2026-06-01T20:53:21",
};
const HOME_VALUE_ROW: WordPressPageIndexRow = {
  id: 3952,
  link: "https://www.ourtownproperties.com/how-much-is-your-home-worth/",
  slug: "how-much-is-your-home-worth",
  status: "publish",
  modified_gmt: "2026-06-01T20:53:22",
};
const WE_BUY_HOMES_ROW: WordPressPageIndexRow = {
  id: 3631,
  link: "https://www.ourtownproperties.com/we-buy-homes/",
  slug: "we-buy-homes",
  status: "publish",
  modified_gmt: "2026-06-01T20:53:23",
};
const LEGACY_HOME_HREF =
  "https://www.askmagicmike.com/value?utm_source=ourtownproperties&#038;utm_medium=homepage_cta&#038;utm_campaign=website_widget";
const LEGACY_HOME_VALUE_HREF =
  "https://www.askmagicmike.com/value?utm_source=ourtownproperties&#038;utm_medium=home_value_page&#038;utm_campaign=website_widget";
const LEGACY_WE_BUY_HOMES_HREF =
  "https://www.askmagicmike.com/value?utm_source=ourtownproperties&#038;utm_medium=seller_page_cta&#038;utm_campaign=website_widget";
const HIDDEN_VISUAL_CONTAINMENT =
  '<style id="amm-visual-containment">.amm-cta,.amm-cta--dark{display:none !important;}</style>';

function homeHtml(
  hrefs: string[],
  options: {
    wrapInCta?: boolean;
    style?: string;
    connectorVersion?: string | null;
  } = {},
) {
  const anchors = hrefs
    .map((href) => `<a class="cta" href="${href}">Ask Mike</a>`)
    .join("\n");
  const connectorVersion = options.connectorVersion === undefined
    ? WORDPRESS_CONNECTOR_REQUIRED_VERSION
    : options.connectorVersion;
  const wrapInCta = options.wrapInCta === undefined
    ? connectorVersion !== null
    : options.wrapInCta;
  const versionAttribute = connectorVersion
    ? ` data-amm-connector-version="${connectorVersion}"`
    : "";
  return `<!doctype html><html><body>
    <p>Public brokerage phone 252-243-7700</p>
    ${options.style ?? ""}
    ${wrapInCta ? `<div class="amm-cta amm-cta--dark"${versionAttribute}>${anchors}</div>` : anchors}
    <script>window.privateExample = "must-not-enter-manifest";</script>
  </body></html>`;
}

function buildHome(html: string, pageRows: WordPressPageIndexRow[] = [HOME_ROW]) {
  return buildWordPressActivationChangeSet({
    placementKey: "wordpress_homepage_ask_mike",
    html,
    pageRows,
    generatedAt: GENERATED_AT,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WordPress owned-demand activation change set", () => {
  it("classifies one exact legacy homepage CTA as ready without performing a mutation", () => {
    const changeSet = buildHome(homeHtml([LEGACY_HOME_HREF]));
    expect(changeSet).toMatchObject({
      schemaVersion: "amm.wordpress_activation_change_set.v3",
      generatedAt: GENERATED_AT,
      mode: "read_only_public_precondition",
      placementKey: "wordpress_homepage_ask_mike",
      status: "legacy_match_ready",
      publicationBlocked: false,
      publicationAuthorized: false,
      approvalRequired: true,
      pageId: 149,
      expectedPageId: 149,
      currentHrefOccurrences: 1,
      rejectedLookalikeHrefOccurrences: 0,
      targetVisibility: "visible_candidate",
      hiddenTargetOccurrences: 0,
      hiddenCssSelectorOccurrences: 0,
      requiredConnectorVersion: "1.1.0",
      observedConnectorVersions: ["1.1.0"],
      connectorVersionReady: true,
      mutationPerformed: false,
      containsRawPageHtml: false,
    });
    expect(changeSet.currentHref).toBe(
      "https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget",
    );
    expect(changeSet.rollbackHref).toBe(changeSet.currentHref);
    expect(changeSet.proposedHref).toContain("utm_content=wordpress_homepage_ask_mike");
    expect(changeSet.approvalGate).toBe(
      "APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION",
    );
  });

  it("loads all reviewed WordPress targets with one shared page-index read and maps readiness truthfully", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/wp-json/")) {
        return new Response(JSON.stringify([
          HOME_ROW,
          HOME_VALUE_ROW,
          WE_BUY_HOMES_ROW,
        ]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const html = url === "https://www.ourtownproperties.com/"
        ? homeHtml([LEGACY_HOME_HREF], {
            wrapInCta: true,
            style: HIDDEN_VISUAL_CONTAINMENT,
          })
        : url.includes("how-much-is-your-home-worth")
          ? homeHtml([LEGACY_HOME_VALUE_HREF])
          : homeHtml([LEGACY_WE_BUY_HOMES_HREF]);
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const changeSets = await loadWordPressActivationChangeSets(undefined, {
      timeoutMs: 5_000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(timeoutSpy).toHaveBeenCalledTimes(4);
    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    expect(fetchMock.mock.calls.filter(([input]) => (
      String(input).includes("/wp-json/")
    ))).toHaveLength(1);
    expect(changeSets.map((row) => [row.placementKey, row.status])).toEqual([
      ["wordpress_homepage_ask_mike", "hidden_target"],
      ["wordpress_home_value", "legacy_match_ready"],
      ["wordpress_we_buy_homes", "seller_intent_decision_required"],
    ]);

    const readiness = changeSets.map(toOwnedDemandPlacementReadiness);
    expect(readiness[0]).toMatchObject({
      activationEligible: false,
      status: "hidden_target",
    });
    expect(readiness[1]).toMatchObject({
      activationEligible: true,
      status: "legacy_match_ready",
    });
    expect(readiness[1]?.nextAction).toContain("verified page-source rollback");
    expect(readiness[2]).toMatchObject({
      activationEligible: false,
      status: "seller_intent_decision_required",
    });
    expect(readiness[2]?.nextAction).toContain("canonical-page");
  });

  it("holds page 3631 until the existing seller-intent and BIC decisions are recorded", () => {
    const changeSet = buildWordPressActivationChangeSet({
      placementKey: "wordpress_we_buy_homes",
      html: homeHtml([LEGACY_WE_BUY_HOMES_HREF]),
      pageRows: [WE_BUY_HOMES_ROW],
      generatedAt: GENERATED_AT,
    });

    expect(changeSet).toMatchObject({
      status: "seller_intent_decision_required",
      publicationBlocked: true,
      publicationAuthorized: false,
      approvalRequired: false,
      approvalGate: null,
      pagePublicationApprovalGate:
        "APPROVE PHASE 9 WE BUY HOMES CTA WORDPRESS PUBLICATION",
      sellerIntentDecisionRequired: true,
      connectorVersionReady: true,
    });
    expect(changeSet.blockers.join(" ")).toContain("seller-intent decision");
    expect(changeSet.publicationSteps.join(" ")).toContain("BIC/compliance review");
    expect(changeSet.proposedShortcode).toContain(
      'headline="Thinking about selling but not sure where to start?"',
    );
    expect(changeSet.proposedShortcode).toContain(
      'text="Ask Magic Mike for local guidance before you make your next move."',
    );
    expect(changeSet.proposedShortcode).toContain('button="Get Local Guidance"');

    const missingTarget = buildWordPressActivationChangeSet({
      placementKey: "wordpress_we_buy_homes",
      html: homeHtml([]),
      pageRows: [WE_BUY_HOMES_ROW],
      generatedAt: GENERATED_AT,
    });
    expect(missingTarget).toMatchObject({
      status: "missing_target",
      publicationBlocked: true,
      approvalGate: null,
    });
  });

  it("blocks an href-only publication when public CSS suppresses the exact CTA container", () => {
    const changeSet = buildHome(homeHtml([LEGACY_HOME_HREF], {
      wrapInCta: true,
      style: HIDDEN_VISUAL_CONTAINMENT,
    }));

    expect(changeSet).toMatchObject({
      status: "hidden_target",
      publicationBlocked: true,
      publicationAuthorized: false,
      approvalRequired: false,
      approvalGate: null,
      targetVisibility: "hidden_by_known_css",
      hiddenTargetOccurrences: 1,
      hiddenCssSelectorOccurrences: 2,
      currentHrefOccurrences: 1,
      mutationPerformed: false,
    });
    expect(changeSet.blockers.join(" ")).toContain("display:none !important");
    expect(changeSet.publicationSteps.join(" ")).toContain("Do not publish an href-only change");
    expect(changeSet.rollbackHref).toBe(changeSet.currentHref);
  });

  it("does not infer that an exact link is hidden from an unrelated rule or container class alone", () => {
    const hiddenRuleWithoutContainer = buildHome(homeHtml([LEGACY_HOME_HREF], {
      style: HIDDEN_VISUAL_CONTAINMENT,
      wrapInCta: false,
    }));
    expect(hiddenRuleWithoutContainer).toMatchObject({
      status: "connector_upgrade_required",
      targetVisibility: "visible_candidate",
      hiddenTargetOccurrences: 0,
      hiddenCssSelectorOccurrences: 2,
    });

    const containerWithoutHiddenRule = buildHome(homeHtml([LEGACY_HOME_HREF], {
      wrapInCta: true,
    }));
    expect(containerWithoutHiddenRule).toMatchObject({
      status: "legacy_match_ready",
      targetVisibility: "visible_candidate",
      hiddenTargetOccurrences: 0,
      hiddenCssSelectorOccurrences: 0,
    });
  });

  it("reports an already-canonical CTA and blocks an unnecessary publication", () => {
    const ready = buildHome(homeHtml([LEGACY_HOME_HREF]));
    const exact = buildHome(homeHtml([ready.proposedHref]));
    expect(exact.status).toBe("already_exact");
    expect(exact.publicationBlocked).toBe(true);
    expect(exact.approvalRequired).toBe(false);
    expect(exact.approvalGate).toBeNull();
    expect(exact.currentHref).toBe(ready.proposedHref);
  });

  it("blocks page publication until the exact reviewed Connector version is publicly proven", () => {
    const missingMarker = buildHome(homeHtml([LEGACY_HOME_HREF], {
      connectorVersion: null,
      wrapInCta: true,
    }));
    expect(missingMarker).toMatchObject({
      schemaVersion: "amm.wordpress_activation_change_set.v3",
      status: "connector_upgrade_required",
      publicationBlocked: true,
      publicationAuthorized: false,
      requiredConnectorVersion: "1.1.0",
      observedConnectorVersions: [],
      connectorVersionReady: false,
      approvalGate: WORDPRESS_CONNECTOR_UPGRADE_APPROVAL_GATE,
    });
    expect(missingMarker.pagePublicationApprovalGate).toBe(
      "APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION",
    );
    expect(missingMarker.publicationSteps.join(" ")).toContain(
      "Do not edit a WordPress page",
    );
    expect(toOwnedDemandPlacementReadiness(missingMarker)).toMatchObject({
      activationEligible: false,
      status: "connector_upgrade_required",
    });

    const staleMarker = buildHome(homeHtml([LEGACY_HOME_HREF], {
      connectorVersion: "1.0.0",
    }));
    expect(staleMarker).toMatchObject({
      status: "connector_upgrade_required",
      observedConnectorVersions: ["1.0.0"],
      connectorVersionReady: false,
    });
    expect(staleMarker.preconditionSha256).not.toBe(missingMarker.preconditionSha256);
  });

  it("fails closed for duplicate, missing, foreign, insecure, and lookalike targets", () => {
    expect(buildHome(homeHtml([LEGACY_HOME_HREF, LEGACY_HOME_HREF]))).toMatchObject({
      status: "ambiguous_target",
      publicationBlocked: true,
      currentHrefOccurrences: 2,
    });
    expect(buildHome(homeHtml([])).status).toBe("missing_target");
    const ignored = buildHome(homeHtml([
      "https://askmagicmike.com.evil.example/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget",
      "http://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget",
    ]));
    expect(ignored).toMatchObject({
      status: "ambiguous_target",
      askMagicMikeHrefOccurrences: 0,
      rejectedLookalikeHrefOccurrences: 2,
      publicationBlocked: true,
      publicationAuthorized: false,
      approvalRequired: false,
      approvalGate: null,
    });
  });

  it("requires one exact published page ID and treats ID drift as a precondition mismatch", () => {
    expect(buildHome(homeHtml([LEGACY_HOME_HREF]), [])).toMatchObject({
      status: "page_id_unresolved",
      publicationBlocked: true,
      pageId: null,
    });
    expect(buildHome(homeHtml([LEGACY_HOME_HREF]), [{ ...HOME_ROW, id: 999 }])).toMatchObject({
      status: "precondition_mismatch",
      publicationBlocked: true,
      pageId: 999,
      expectedPageId: 149,
    });
    expect(buildHome(homeHtml([LEGACY_HOME_HREF]), [HOME_ROW, { ...HOME_ROW, id: 150 }]).status)
      .toBe("ambiguous_target");
    expect(buildHome(homeHtml([LEGACY_HOME_HREF]), [{
      id: HOME_ROW.id,
      link: HOME_ROW.link,
    }])).toMatchObject({
      status: "page_id_unresolved",
      publicationBlocked: true,
    });
    expect(buildWordPressActivationChangeSet({
      placementKey: "wordpress_homepage_ask_mike",
      html: homeHtml([LEGACY_HOME_HREF]),
      pageRows: [
        null,
        7,
        { id: "149", link: HOME_ROW.link },
        { id: 149, link: HOME_ROW.link },
        { ...HOME_ROW, status: "draft" },
        HOME_ROW,
      ],
      generatedAt: GENERATED_AT,
    }).status).toBe("legacy_match_ready");
  });

  it("creates a deterministic privacy-safe precondition hash without retaining page HTML", () => {
    const first = buildHome(homeHtml([LEGACY_HOME_HREF]));
    const second = buildHome(homeHtml([LEGACY_HOME_HREF]));
    expect(first.preconditionSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(second.preconditionSha256).toBe(first.preconditionSha256);
    const ambiguous = buildHome(homeHtml([
      LEGACY_HOME_HREF,
      "https://askmagicmike.com.evil.example/value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget",
    ]));
    expect(ambiguous.status).toBe("ambiguous_target");
    expect(ambiguous.preconditionSha256).not.toBe(first.preconditionSha256);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain("252-243-7700");
    expect(serialized).not.toContain("must-not-enter-manifest");
    expect(serialized).not.toContain("<html");
  });

  it("allowlists only exact Our Town HTTPS source URLs", () => {
    expect(normalizeWordPressActivationUrl("https://www.ourtownproperties.com/#cta"))
      .toBe("https://www.ourtownproperties.com/");
    for (const value of [
      "http://www.ourtownproperties.com/",
      "https://www.ourtownproperties.com:444/",
      "https://user@www.ourtownproperties.com/",
      "https://ourtownproperties.com.evil.example/",
      "https://127.0.0.1/",
    ]) {
      expect(() => normalizeWordPressActivationUrl(value)).toThrow(
        /outside the exact approved HTTPS hosts/,
      );
    }
  });

  it("cancels an upstream body as soon as the streaming response cap is exceeded", async () => {
    let cancelled = false;
    const oversizedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2_000_000));
        controller.enqueue(new Uint8Array(1_100_000));
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/wp-json/")) {
        return new Response(JSON.stringify([HOME_ROW]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(oversizedBody, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }));

    const changeSet = await loadWordPressActivationChangeSet(
      "wordpress_homepage_ask_mike",
    );
    expect(changeSet).toMatchObject({
      status: "fetch_failed",
      fetchErrorCode: "wordpress_page_fetch_failed",
      publicationBlocked: true,
      approvalRequired: false,
      approvalGate: null,
      mutationPerformed: false,
    });
    expect(cancelled).toBe(true);
  });
});

describe("WordPress activation API and operator boundary", () => {
  const route = readFileSync(
    "app/api/admin/distribution/wordpress-change-set/[placementKey]/route.ts",
    "utf8",
  );
  const page = readFileSync("app/admin/distribution/page.tsx", "utf8");
  const activeRouteManifest = JSON.parse(
    readFileSync("config/active-route-manifest.json", "utf8"),
  ) as {
    expectedRoutes: string[];
    required: { api: string[] };
    classifications: Record<string, string>;
  };
  const routePath = "/api/admin/distribution/wordpress-change-set/[placementKey]";

  it("requires report permission, accepts an allowlisted key, and returns private no-store JSON", () => {
    expect(route).toContain('requireLeadCenterApiPermission(request, "report:view")');
    expect(route).toContain("isWordPressActivationPlacementKey(placementKey)");
    expect(route).toContain("loadWordPressActivationChangeSet(placementKey)");
    expect(route).toContain("loadWordPressSellerIntentDecisionManifest()");
    expect(route).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(route).toContain('"Content-Security-Policy": "default-src \'none\'; sandbox"');
    expect(route).toContain('"Cross-Origin-Resource-Policy": "same-origin"');
    expect(route).toContain('"Referrer-Policy": "no-referrer"');
    expect(route).toContain('"X-Robots-Tag": "noindex, nofollow, noarchive"');
    expect(route).toContain("Content-Disposition");
  });

  it("exposes only GET and no WordPress mutation, arbitrary URL, database, or send path", () => {
    expect(route).not.toMatch(/export async function (?:POST|PUT|PATCH|DELETE)/);
    expect(route).not.toMatch(/searchParams|DATABASE_URL|INSERT|UPDATE|DELETE|email|sms|send\(/i);
    expect(page).toContain("Download live readiness manifest");
    expect(page).toContain("Download decision packet");
    expect(page).toContain('data-seller-intent-decision-manifest="true"');
    expect(page).toContain("they do not publish");
    expect(page).toContain("loadWordPressActivationChangeSets");
    expect(page).toContain("timeoutMs: 5_000");
    expect(page).toContain("Readiness hold");
    expect(page).toContain("Every remaining placement is already measured or on an explicit");
    expect(page).toContain('channel.namedPlacements.length ? "xl:col-span-2" : ""');
  });

  it("registers the protected route explicitly in the canonical root-router contract", () => {
    expect(activeRouteManifest.expectedRoutes).toContain(routePath);
    expect(activeRouteManifest.required.api).toContain(routePath);
    expect(activeRouteManifest.classifications[routePath]).toBe(
      "active-protected-read-only-wordpress-public-precondition-export",
    );
  });
});
