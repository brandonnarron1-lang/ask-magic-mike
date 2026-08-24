import { describe, expect, it } from "vitest";

import {
  APPROVED_GTM_CONTAINER_ID,
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

  it("holds activation when GTM and a Google tag initialize before the cookie-choice provider", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script>window.dataLayer=[];https://www.googletagmanager.com/gtm.js?id=${APPROVED_GTM_CONTAINER_ID}</script>
        <script defer src="https://data.processwebsitedata.com/cscripts/example.js"></script>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: `
        "tags":[{"function":"__googtag","vtp_tagId":"G-ABC12345"}],
        "predicates":[{"arg1":"gtm.init"}],"rules":[[["add",0]]]
      `,
    });

    expect(outcome.readyForAuthenticatedActivationReview).toBe(false);
    expect(outcome.blockers).toEqual(expect.arrayContaining([
      "brokerage_consent_default_not_before_gtm",
      "brokerage_cookie_choice_provider_not_before_gtm",
      "brokerage_google_tag_fires_on_initialization",
    ]));
    expect(outcome.facts.askHasServerGoogleBootstrap).toBe(false);
  });

  it("passes the static boundary only when consent precedes GTM and identities remain isolated", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script>gtag('consent','default',{analytics_storage:'denied'});</script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
        <script>https://www.googletagmanager.com/gtm.js?id=${APPROVED_GTM_CONTAINER_ID}</script>
      `,
      askMagicMikeHtml: "<html><body>Ask Magic Mike</body></html>",
      containerSource: '"tags":[],"measurement":"G-ABC12345"',
    });

    expect(outcome).toMatchObject({
      readyForAuthenticatedActivationReview: true,
      blockers: [],
      facts: {
        brokerageContainers: [APPROVED_GTM_CONTAINER_ID],
        consentDefaultPrecedesGtm: true,
        cookieChoiceProviderPrecedesGtm: true,
        googleTagFiresOnInitialization: false,
        askHasServerGoogleBootstrap: false,
        identityCollisionDetected: false,
      },
    });
  });

  it("fails closed on unrelated containers, preconsent Ask tags, or NellySelly identity", () => {
    const outcome = inspectCrossDomainMeasurementContract({
      brokerageHtml: `
        <script>gtag('consent','default',{});</script>
        <script src="https://data.processwebsitedata.com/cscripts/example.js"></script>
        <script>https://www.googletagmanager.com/gtm.js?id=GTM-NELLY1</script>
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
