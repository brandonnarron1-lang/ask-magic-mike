"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  deactivateExternalAnalytics,
  EXTERNAL_ANALYTICS_PREFERENCES_EVENT,
  isExternalAnalyticsEligibleBrowser,
  loadExternalAnalytics,
  readExternalAnalyticsConsent,
  writeExternalAnalyticsConsent,
  type ExternalAnalyticsConsent,
} from "../../lib/externalAnalytics";
import { isApprovedOurTownGtmContainerId } from "../../lib/googleTagConfig";

type ExternalAnalyticsConsentManagerProps = {
  gtmContainerId: string | null;
};

export function ExternalAnalyticsConsentManager({
  gtmContainerId,
}: ExternalAnalyticsConsentManagerProps) {
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);
  const [choice, setChoice] = useState<ExternalAnalyticsConsent>("unset");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isApprovedOurTownGtmContainerId(gtmContainerId)) {
      deactivateExternalAnalytics();
      setEligible(false);
      setOpen(false);
      return;
    }
    const currentEligible = isExternalAnalyticsEligibleBrowser();
    setEligible(currentEligible);
    if (!currentEligible) {
      const hadLoadedRuntime = deactivateExternalAnalytics();
      setOpen(false);
      if (hadLoadedRuntime) window.location.reload();
      return;
    }

    const storedChoice = readExternalAnalyticsConsent();
    setChoice(storedChoice);
    setOpen(storedChoice === "unset");
    if (storedChoice === "granted") loadExternalAnalytics(gtmContainerId);

    const openPreferences = () => setOpen(true);
    window.addEventListener(EXTERNAL_ANALYTICS_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.removeEventListener(EXTERNAL_ANALYTICS_PREFERENCES_EVENT, openPreferences);
    };
  }, [gtmContainerId, pathname]);

  if (!isApprovedOurTownGtmContainerId(gtmContainerId) || !eligible || !open) return null;

  function grantAnalytics() {
    if (!writeExternalAnalyticsConsent("granted")) return;
    setChoice("granted");
    loadExternalAnalytics(gtmContainerId!);
    setOpen(false);
  }

  function denyAnalytics() {
    const wasGranted = choice === "granted";
    if (!writeExternalAnalyticsConsent("denied")) return;
    setChoice("denied");
    const hadLoadedRuntime = deactivateExternalAnalytics({ clearCookies: true });
    setOpen(false);
    if (wasGranted && hadLoadedRuntime) window.location.reload();
  }

  return (
    <section
      aria-label="Analytics preferences"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#d9b35d66] bg-[#080808]/[0.98] p-5 text-[#f4ead4] shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur sm:inset-x-6 sm:p-6"
      data-testid="external-analytics-consent"
    >
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2c06f]">
            Analytics choice
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#f4ead4]">
            Help improve the Ask Magic Mike experience?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
            Optional Google Analytics helps us understand public journeys between
            Our Town Properties and Ask Magic Mike. It stays off until you allow
            it. Advertising storage and personalization remain off, and lead
            contact details are never analytics event fields.
          </p>
          <a
            className="mt-3 inline-block text-sm text-[#e2c06f] underline-offset-4 hover:underline"
            href="/privacy"
          >
            Read the privacy details
          </a>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <button
            className="min-h-11 rounded-lg bg-[#e2c06f] px-5 py-3 text-sm font-bold text-[#15110a] transition hover:bg-[#f2d993] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4ead4]"
            onClick={grantAnalytics}
            type="button"
          >
            Allow analytics
          </button>
          <button
            className="min-h-11 rounded-lg border border-[#d9b35d66] px-5 py-3 text-sm font-semibold text-[#f4ead4] transition hover:border-[#e2c06f] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4ead4]"
            onClick={denyAnalytics}
            type="button"
          >
            Decline
          </button>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsPreferencesButton() {
  const pathname = usePathname();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(
      document.documentElement.dataset.ammExternalAnalytics === "available" &&
      isExternalAnalyticsEligibleBrowser(),
    );
  }, [pathname]);

  if (!available) return null;

  return (
    <button
      className="text-[#e2c06f] hover:text-[#f4ead4]"
      onClick={() => window.dispatchEvent(new Event(EXTERNAL_ANALYTICS_PREFERENCES_EVENT))}
      type="button"
    >
      Analytics preferences
    </button>
  );
}
