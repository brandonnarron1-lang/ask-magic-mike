/**
 * Read-only activation preflight for the shared Our Town / Ask Magic Mike
 * measurement boundary. It never signs in, changes consent, submits a form, or
 * writes to either application.
 *
 * Run: pnpm run amm:verify:cross-domain
 */

import { fileURLToPath } from "node:url";

export const APPROVED_GTM_CONTAINER_ID = "GTM-KZMCSLTJ";
export const BASIC_CONSENT_GATE_VERSION = "basic-v1";

export function extractGtmContainerIds(source) {
  return [...new Set(String(source).match(/GTM-[A-Z0-9]+/g) ?? [])].sort();
}

export function extractGoogleMeasurementIds(source) {
  return [...new Set(String(source).match(/G-[A-Z0-9]{6,}/g) ?? [])].sort();
}

function firstMatchIndex(source, pattern) {
  const match = pattern.exec(source);
  return match?.index ?? -1;
}

export function inspectCrossDomainMeasurementContract({
  brokerageHtml,
  askMagicMikeHtml,
  containerSource,
}) {
  const brokerageContainers = extractGtmContainerIds(brokerageHtml);
  const measurementIds = extractGoogleMeasurementIds(containerSource);
  const brokerageSource = String(brokerageHtml);
  const basicConsentGateIndex = firstMatchIndex(
    brokerageSource,
    /data-amm-consent-gate\s*=\s*["']basic-v1["']/i,
  );
  const cookieChoiceProviderIndex = brokerageSource.indexOf(
    "data.processwebsitedata.com/cscripts/",
  );
  const legacyGtmBootstrapDetected =
    /www\.googletagmanager\.com\/gtm\.js(?:\?|["'])/i.test(brokerageSource);
  const legacyGtmNoscriptDetected =
    /www\.googletagmanager\.com\/ns\.html\?id=GTM-[A-Z0-9]+/i.test(
      brokerageSource,
    );
  const canonicalBasicGateDetected =
    basicConsentGateIndex >= 0 &&
    new RegExp(
      `data-amm-gtm-container\\s*=\\s*["']${APPROVED_GTM_CONTAINER_ID}["']`,
      "i",
    ).test(brokerageSource);
  const basicGatePrecedesCookieChoiceProvider =
    basicConsentGateIndex >= 0 &&
    cookieChoiceProviderIndex >= 0 &&
    basicConsentGateIndex < cookieChoiceProviderIndex;
  const googleTagFiresOnInitialization =
    /"function":"__googtag"/.test(containerSource) &&
    /"arg1":"gtm\.init"/.test(containerSource) &&
    /\["add",0\]/.test(containerSource);
  const askHasServerGoogleBootstrap =
    /www\.googletagmanager\.com\/(?:gtm|gtag)(?:\.js)?/i.test(askMagicMikeHtml);
  const identityCollisionDetected = /nellyselly/i.test(
    `${brokerageHtml}\n${askMagicMikeHtml}\n${containerSource}`,
  );

  const blockers = [];
  if (
    !brokerageContainers.includes(APPROVED_GTM_CONTAINER_ID) ||
    brokerageContainers.some((id) => id !== APPROVED_GTM_CONTAINER_ID)
  ) {
    blockers.push("brokerage_container_identity_mismatch");
  }
  if (!canonicalBasicGateDetected) {
    blockers.push("brokerage_basic_consent_gate_missing");
  }
  if (!basicGatePrecedesCookieChoiceProvider) {
    blockers.push("brokerage_basic_gate_not_before_cookie_choice_provider");
  }
  if (legacyGtmBootstrapDetected) {
    blockers.push("brokerage_legacy_gtm_bootstrap_present");
  }
  if (legacyGtmNoscriptDetected) {
    blockers.push("brokerage_legacy_gtm_noscript_present");
  }
  if (askHasServerGoogleBootstrap) {
    blockers.push("ask_production_has_preconsent_google_bootstrap");
  }
  if (identityCollisionDetected) {
    blockers.push("nellyselly_identity_collision");
  }

  return {
    readyForAuthenticatedActivationReview: blockers.length === 0,
    blockers,
    facts: {
      brokerageContainers,
      measurementIds,
      canonicalBasicGateDetected,
      basicGatePrecedesCookieChoiceProvider,
      cookieChoiceProviderDetected: cookieChoiceProviderIndex >= 0,
      legacyGtmBootstrapDetected,
      legacyGtmNoscriptDetected,
      googleTagFiresOnInitialization,
      askHasServerGoogleBootstrap,
      identityCollisionDetected,
    },
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "AskMagicMikeCrossDomainVerifier/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function run() {
  const [brokerageHtml, askMagicMikeHtml] = await Promise.all([
    fetchText("https://www.ourtownproperties.com/"),
    fetchText("https://www.askmagicmike.com/"),
  ]);
  const containerSource = await fetchText(
    `https://www.googletagmanager.com/gtm.js?id=${APPROVED_GTM_CONTAINER_ID}`,
  );
  const result = inspectCrossDomainMeasurementContract({
    brokerageHtml,
    askMagicMikeHtml,
    containerSource,
  });

  console.log("Ask Magic Mike — Cross-Domain Measurement Preflight");
  console.log(`Verdict: ${result.readyForAuthenticatedActivationReview ? "REVIEW_READY" : "HOLD"}`);
  console.log(`Approved brokerage container: ${result.facts.brokerageContainers.join(", ") || "not detected"}`);
  console.log(`Google measurement destinations: ${result.facts.measurementIds.join(", ") || "not detected"}`);
  console.log(`Canonical Basic Consent gate detected: ${result.facts.canonicalBasicGateDetected}`);
  console.log(`Legacy GTM bootstrap present: ${result.facts.legacyGtmBootstrapDetected}`);
  console.log(`Legacy GTM noscript present: ${result.facts.legacyGtmNoscriptDetected}`);
  console.log(`Container tags fire after permitted load: ${result.facts.googleTagFiresOnInitialization}`);
  console.log(`Ask server HTML is tag-inert: ${!result.facts.askHasServerGoogleBootstrap}`);
  console.log(`NellySelly identity collision: ${result.facts.identityCollisionDetected}`);
  for (const blocker of result.blockers) console.log(`BLOCKER ${blocker}`);
  console.log("Read-only check: no consent choice, form, account, database, or deployment write was performed.");

  if (!result.readyForAuthenticatedActivationReview) process.exitCode = 2;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((error) => {
    console.error(`Cross-domain measurement preflight failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
