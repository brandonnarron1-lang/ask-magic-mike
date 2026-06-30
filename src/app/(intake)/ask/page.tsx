"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { IntakeShell } from "@/components/intake/intake-shell";
import { StepQuestion } from "@/components/intake/step-question";
import { StepIntent } from "@/components/intake/step-intent";
import { StepContact } from "@/components/intake/step-contact";
import { StepConsent } from "@/components/intake/step-consent";
import { StepConfirmation } from "@/components/intake/step-confirmation";
import { useSession, type UseSessionAttribution } from "@/hooks/use-session";
import { useIntakeFlow } from "@/hooks/use-intake-flow";
import {
  captureAttribution,
  readAttribution,
} from "@/lib/attribution/client-storage";
import type { CTAChip, PrimaryIntent, TimelineMonths } from "@/types/domain.types";

function AskPageInner() {
  const params = useSearchParams();

  const initialQuestion = params.get("q") ?? "";
  const initialAddress = params.get("address") ?? "";
  const initialChip = (params.get("chip") as CTAChip) ?? null;

  // Resolve attribution from URL (if /value forwarded UTMs) or sessionStorage
  // (if user landed straight on /ask). captureAttribution writes back so the
  // session row persists what we actually saw.
  const attribution = useMemo<UseSessionAttribution>(() => {
    if (typeof window === "undefined") return {};
    const captured = captureAttribution() ?? readAttribution();
    return {
      utmSource:    captured?.utmSource ?? null,
      utmMedium:    captured?.utmMedium ?? null,
      utmCampaign:  captured?.utmCampaign ?? null,
      utmContent:   captured?.utmContent ?? null,
      utmTerm:      captured?.utmTerm ?? null,
      referrerUrl:  captured?.referrerUrl ?? null,
      referrerType: captured?.referrerType ?? "direct",
      landingPage:  captured?.landingPath ?? window.location.pathname,
      initialQuestion: initialQuestion || null,
      initialAddress:  initialAddress || null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { sessionId } = useSession(attribution);

  const flow = useIntakeFlow(sessionId, {
    question: initialQuestion,
    address: initialAddress,
    ctaChip: initialChip,
  });

  const renderStep = () => {
    switch (flow.step) {
      case 1:
        return (
          <StepQuestion
            question={flow.data.question}
            address={flow.data.address}
            onQuestionChange={(q) => flow.updateData({ question: q })}
            onAddressChange={(a) => flow.updateData({ address: a })}
            onNext={flow.nextStep}
          />
        );
      case 2:
        return (
          <StepIntent
            intent={flow.data.intent}
            timelineMonths={flow.data.timelineMonths}
            onIntentChange={(intent) =>
              flow.updateData({ intent: intent as PrimaryIntent })
            }
            onTimelineChange={(months) =>
              flow.updateData({ timelineMonths: months as TimelineMonths })
            }
            onNext={flow.nextStep}
            question={flow.data.question}
          />
        );
      case 3:
        return (
          <StepContact
            firstName={flow.data.firstName}
            lastName={flow.data.lastName}
            email={flow.data.email}
            phone={flow.data.phone}
            onChange={(field, value) =>
              flow.updateData({ [field]: value } as Parameters<typeof flow.updateData>[0])
            }
            onNext={flow.nextStep}
          />
        );
      case 4:
        return (
          <StepConsent
            consentSms={flow.data.consentSms}
            consentCall={flow.data.consentCall}
            consentEmail={flow.data.consentEmail}
            onToggle={(key) =>
              flow.updateData({ [key]: !flow.data[key] })
            }
            onSubmit={flow.submit}
            submitting={flow.submitting}
          />
        );
      case 5:
        return (
          <StepConfirmation
            firstName={flow.data.firstName}
            score={flow.score}
            question={flow.data.question}
            intent={flow.data.intent}
          />
        );
      default:
        return null;
    }
  };

  return (
    <IntakeShell
      step={flow.step}
      totalSteps={flow.totalSteps}
      progress={flow.progress}
      onBack={flow.prevStep}
      showBack={flow.step > 1 && flow.step < 5}
    >
      {flow.error && (
        <div className="mb-4 rounded-lg border border-ruby-400/30 bg-ruby-400/[0.08] px-4 py-3 text-sm text-ruby-300">
          {flow.error}
        </div>
      )}
      {renderStep()}
    </IntakeShell>
  );
}

function AskLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-6 space-y-4 animate-pulse">
        <div className="h-2 w-full rounded-full bg-white/[0.06]" />
        <div className="h-10 w-3/4 rounded-xl bg-white/[0.04]" />
        <div className="h-4 w-1/2 rounded bg-white/[0.04]" />
        <div className="h-32 w-full rounded-xl bg-white/[0.03]" />
        <div className="h-12 w-full rounded-xl bg-gold-400/[0.08]" />
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<AskLoadingSkeleton />}>
      <AskPageInner />
    </Suspense>
  );
}
