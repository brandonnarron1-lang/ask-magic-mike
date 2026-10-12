"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HOME_VALUE_TRUST_EXPERIMENT,
  type PublicExperimentContext,
} from "../../lib/growth/experiment-registry";
import { recordExperimentEvent } from "../../lib/growth/public-experiment-client";
import { HomeValueFunnel } from "./HomeValueFunnel";
import { usePublicIntakeCapability } from "../../lib/publicIntakeCapability";
import { IntakeModeNotice } from "./IntakeModeNotice";

const SUBJECT_STORAGE_KEY = "amm_public_experiment_subject_v1";

function subjectSeed() {
  try {
    const stored = window.sessionStorage.getItem(SUBJECT_STORAGE_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SUBJECT_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

async function hashSubject(value: string) {
  if (!crypto.subtle) return null;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function HomeValueExperimentExperience() {
  const [context, setContext] = useState<PublicExperimentContext | null>(null);
  const intakeMode = usePublicIntakeCapability();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const subjectKey = await hashSubject(subjectSeed());
      if (!subjectKey || cancelled) return;
      const provisional: PublicExperimentContext = {
        experimentKey: HOME_VALUE_TRUST_EXPERIMENT.key,
        subjectKey,
        variantKey: "control",
      };
      const outcome = await recordExperimentEvent(provisional, "exposure");
      const variantKey = outcome?.active && typeof outcome.variant_key === "string"
        ? outcome.variant_key
        : null;
      if (!variantKey || !HOME_VALUE_TRUST_EXPERIMENT.variants.some((variant) => variant.key === variantKey)) return;
      if (!cancelled) setContext({ ...provisional, variantKey });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const variant = useMemo(
    () => HOME_VALUE_TRUST_EXPERIMENT.variants.find((candidate) => candidate.key === context?.variantKey) ??
      HOME_VALUE_TRUST_EXPERIMENT.variants[0],
    [context?.variantKey],
  );

  return (
    <div className="mx-auto max-w-7xl">
      {intakeMode !== "live" ? <IntakeModeNotice mode={intakeMode} className="mb-6 lg:mb-8" /> : null}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)] lg:items-start lg:gap-10">
        <div className="min-w-0 [overflow-wrap:anywhere]" data-experiment={context?.experimentKey} data-variant={context?.variantKey}>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Home Value</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4] sm:text-4xl lg:mt-4 lg:text-6xl">
            <span className="lg:hidden">Request a local home value review.</span>
            <span className="hidden lg:inline">{variant.headline}</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-[#d9ceb8] lg:mt-5 lg:text-lg lg:leading-8">
            <span className="lg:hidden">Share the address and your best contact method. Mike or the Our Town Properties team can review the property and follow up with practical next steps.</span>
            <span className="hidden lg:inline">{variant.description}</span>
          </p>
        </div>
        <HomeValueFunnel surface="home_value_page" experimentContext={context} />
      </div>
    </div>
  );
}
