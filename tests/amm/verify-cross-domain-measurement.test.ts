import { describe, expect, it } from "vitest";

import {
  APPROVED_GTM_CONTAINER_ID,
  BASIC_CONSENT_GATE_VERSION,
  extractGoogleMeasurementIds,
  extractGtmContainerIds,
  inspectCrossDomainMeasurementContract,
} from "../../scripts/amm/verify-cross-domain-measurement.mjs";

describe("cross-domain measurement activation contract", () => {
  it("extracts only unique public container and destination identifiers", () => {
    expect(extractGtmContainerIds(
      `id=${APPROVED_GTM_CONTAINER_ID} id=${APPROVED_GTM_CONTAINER_ID} id=GTM-OTHER1`,
    )).toEqual([APPROVED_GTM_CONTAINER_ID, "GTM-OTHER1"]);
    expect(extractGoogleMeasurementIds("G-ABC12345 G-ABC12345 G-XYZ67890"))
      .toEqual(["G-ABC12345", "G-XYZ67890"]);
  });

  it("holds the current legacy ordering even when the cookie-choice provider is present", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script>window.dataLayer=[];https://www.googletagmanager.com/gtm.js?id=${APPROVED_GTM_CONTAINER_ID}</script>
        <script defer src="https://data.processwebsitedata.com/cscripts/example.js"></script>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${APPROVED_GTM_CONTAINER_ID}"></iframe></noscript>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: `
        "tags":[{"function":"__googtag","vtp_tagId":"G-ABC12345"}],
        "predicates":[{"arg1":"gtm.init"}],"rules":[[["add",0]]]
      `,
    });

    expect(outcome.readyForAuthenticatedActivationReview).toBe(false);
    expect(outcome.blockers).toEqual(expect.arrayContaining([
      "brokerage_basic_consent_gate_missing",
      "brokerage_basic_gate_not_before_cookie_choice_provider",
      "brokerage_legacy_gtm_bootstrap_present",
      "brokerage_legacy_gtm_noscript_present",
    ]));
    expect(outcome.facts.googleTagFiresOnInitialization).toBe(true);
    expect(outcome.facts.askHasServerGoogleBootstrap).toBe(false);
  });

  it("passes the static boundary with only the canonical Basic Consent loader", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script
          data-amm-consent-gate="${BASIC_CONSENT_GATE_VERSION}"
          data-amm-gtm-container="${APPROVED_GTM_CONTAINER_ID}"
          src="/wp-content/plugins/ask-magic-mike-canonical-bridge/assets/amm-consent-gate.js"
        ></script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: `
        "tags":[{"function":"__googtag","vtp_tagId":"G-ABC12345"}],
        "predicates":[{"arg1":"gtm.init"}],"rules":[[["add",0]]]
      `,
    });

    expect(outcome).toMatchObject({
      readyForAuthenticatedActivationReview: true,
      blockers: [],
      facts: {
        brokerageContainers: [APPROVED_GTM_CONTAINER_ID],
        canonicalBasicGateDetected: true,
        basicGatePrecedesCookieChoiceProvider: true,
        legacyGtmBootstrapDetected: false,
        legacyGtmNoscriptDetected: false,
        googleTagFiresOnInitialization: true,
        askHasServerGoogleBootstrap: false,
        identityCollisionDetected: false,
      },
    });
  });

  it("holds when the canonical gate and a legacy GTM bootstrap coexist", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script data-amm-consent-gate="${BASIC_CONSENT_GATE_VERSION}" data-amm-gtm-container="${APPROVED_GTM_CONTAINER_ID}"></script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
        <script>https://www.googletagmanager.com/gtm.js?id=${APPROVED_GTM_CONTAINER_ID}</script>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: '"measurement":"G-ABC12345"',
    });

    expect(outcome.readyForAuthenticatedActivationReview).toBe(false);
    expect(outcome.blockers).toContain("brokerage_legacy_gtm_bootstrap_present");
  });

  it("holds when a legacy GTM noscript bypass remains", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script data-amm-consent-gate="${BASIC_CONSENT_GATE_VERSION}" data-amm-gtm-container="${APPROVED_GTM_CONTAINER_ID}"></script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${APPROVED_GTM_CONTAINER_ID}"></iframe></noscript>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: '"measurement":"G-ABC12345"',
    });

    expect(outcome.readyForAuthenticatedActivationReview).toBe(false);
    expect(outcome.blockers).toContain("brokerage_legacy_gtm_noscript_present");
  });

  it("fails closed on unrelated containers, preconsent Ask tags, or NellySelly identity", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script data-amm-consent-gate="${BASIC_CONSENT_GATE_VERSION}" data-amm-gtm-container="GTM-NELLY1"></script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
      `,
      askMagicMikeHtml: '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-NELLY1"></script>',
      containerSource: "nellyselly G-ABC12345",
    });

    expect(outcome.readyForAuthenticatedActivationReview).toBe(false);
    expect(outcome.blockers).toEqual(expect.arrayContaining([
      "brokerage_container_identity_mismatch",
      "ask_production_has_preconsent_google_bootstrap",
      "nellyselly_identity_collision",
    ]));
  });
});
