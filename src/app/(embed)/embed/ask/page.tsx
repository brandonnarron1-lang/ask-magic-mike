"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { captureAttribution } from "@/lib/attribution/client-storage";
import { EmbedShell } from "@/components/embed/embed-shell";
import { StepQuestion } from "@/components/intake/step-question";
import { StepIntent } from "@/components/intake/step-intent";
import { StepContact } from "@/components/intake/step-contact";
import { StepConsent } from "@/components/intake/step-consent";
import { StepConfirmation } from "@/components/intake/step-confirmation";
import { useSession } from "@/hooks/use-session";
import { useIntakeFlow } from "@/hooks/use-intake-flow";
import type { CTAChip, PrimaryIntent, TimelineMonths } from "@/types/domain.types";

function EmbedAskInner() {
  const params = useSearchParams();
  const initialQuestion = params.get("q") ?? "";
  const initialAddress  = params.get("address") ?? "";
  const initialChip     = (params.get("chip") as CTAChip) ?? null;

  // Persist UTMs from the iframe URL into sessionStorage so readAttribution()
  // returns them at form submit time. The loader injects utm_* params and a
  // referrer param into the iframe src — without this call, source_attribution
  // is never written because readAttribution() returns null.
  useEffect(() => {
    captureAttribution();
  }, []);

  // Extract UTMs from iframe URL params for session creation. Memoized to
  // prevent useSession from re-running createSession on every render.
  const utmSource   = params.get("utm_source");
  const utmMedium   = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmContent  = params.get("utm_content");
  const utmTerm     = params.get("utm_term");
  const referrer    = params.get("referrer");

  const sessionAttribution = useMemo(() => ({
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referrerUrl: referrer,
  }), [utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrer]);

  const { sessionId } = useSession(sessionAttribution);

  // Fire once when session is established. Enables real session counts and
  // conversion rate in the traffic dashboard (traffic-command.ts queries
  // analytics_events for page_view to compute sessions7d vs leads7d).
  useEffect(() => {
    if (!sessionId) return;
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "page_view",
        sessionId,
        properties: { page: "embed_ask", context: "iframe" },
        utmSource:   utmSource   ?? undefined,
        utmMedium:   utmMedium   ?? undefined,
        utmCampaign: utmCampaign ?? undefined,
      }),
    }).catch(() => {}); // never block intake
  }, [sessionId, utmSource, utmMedium, utmCampaign]);

  const flow = useIntakeFlow(sessionId, {
    question: initialQuestion,
    address:  initialAddress,
    ctaChip:  initialChip,
  });

  const renderStep = () => {
    switch (flow.step) {
      case 1: return (
        <StepQuestion
          question={flow.data.question}
          address={flow.data.address}
          onQuestionChange={(q) => flow.updateData({ question: q })}
          onAddressChange={(a) => flow.updateData({ address: a })}
          onNext={flow.nextStep}
        />
      );
      case 2: return (
        <StepIntent
          intent={flow.data.intent}
          timelineMonths={flow.data.timelineMonths}
          onIntentChange={(intent) => flow.updateData({ intent: intent as PrimaryIntent })}
          onTimelineChange={(months) => flow.updateData({ timelineMonths: months as TimelineMonths })}
          onNext={flow.nextStep}
        />
      );
      case 3: return (
        <StepContact
          firstName={flow.data.firstName}
          lastName={flow.data.lastName}
          email={flow.data.email}
          phone={flow.data.phone}
          onChange={(field, value) => flow.updateData({ [field]: value } as Parameters<typeof flow.updateData>[0])}
          onNext={flow.nextStep}
        />
      );
      case 4: return (
        <StepConsent
          consentSms={flow.data.consentSms}
          consentCall={flow.data.consentCall}
          consentEmail={flow.data.consentEmail}
          onToggle={(key) => flow.updateData({ [key]: !flow.data[key] })}
          onSubmit={flow.submit}
          submitting={flow.submitting}
        />
      );
      case 5: return (
        <StepConfirmation firstName={flow.data.firstName} score={flow.score} />
      );
      default: return null;
    }
  };

  return (
    <EmbedShell
      step={flow.step}
      totalSteps={flow.totalSteps}
      progress={flow.progress}
      onBack={flow.prevStep}
      showBack={flow.step > 1 && flow.step < 5}
    >
      {flow.error && (
        <div className="mb-3 rounded-lg border border-ruby-400/30 bg-ruby-400/[0.08] px-3 py-2.5 text-sm text-ruby-300">
          {flow.error}
        </div>
      )}
      {renderStep()}
    </EmbedShell>
  );
}

export default function EmbedAskPage() {
  return (
    <Suspense>
      <EmbedAskInner />
    </Suspense>
  );
}
