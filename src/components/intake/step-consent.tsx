"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const CONSENT_LANGUAGE_V1 = `By checking the boxes below, you agree to be contacted by Mike Eatmon and Our Town Properties regarding real estate services. You understand that:

• Your consent to receive SMS text messages, phone calls, and/or emails is not a condition of purchase or service.
• Standard message and data rates may apply for SMS.
• You may opt out at any time by replying STOP (SMS), requesting removal by email, or contacting us directly.
• We will not sell, rent, or share your contact information with third parties for marketing purposes.
• This consent is provided under the Telephone Consumer Protection Act (TCPA).

Our Town Properties, Inc. · Wilson, NC · Licensed Real Estate Broker${process.env.NEXT_PUBLIC_AGENT_LICENSE ? ` #${process.env.NEXT_PUBLIC_AGENT_LICENSE}` : ""}`;

interface ConsentOption {
  key: "consentSms" | "consentCall" | "consentEmail";
  label: string;
  description: string;
  testId: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    key: "consentSms",
    label: "Text / SMS",
    description: "Receive updates and responses via text message",
    testId: "consent-sms",
  },
  {
    key: "consentCall",
    label: "Phone Call",
    description: "Mike may call you directly to discuss your needs",
    testId: "consent-call",
  },
  {
    key: "consentEmail",
    label: "Email",
    description: "Receive market reports, valuations, and follow-ups",
    testId: "consent-email",
  },
];

interface StepConsentProps {
  consentSms: boolean;
  consentCall: boolean;
  consentEmail: boolean;
  onToggle: (key: "consentSms" | "consentCall" | "consentEmail") => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export function StepConsent({
  consentSms,
  consentCall,
  consentEmail,
  onToggle,
  onSubmit,
  submitting = false,
}: StepConsentProps) {
  const values = { consentSms, consentCall, consentEmail };
  const hasConsent = consentSms || consentCall || consentEmail;

  return (
    <div className="pt-2">
      <h2 className="font-display text-[26px] sm:text-3xl font-semibold text-[#F7F1E8] mb-2 leading-tight">
        How can Mike contact you?
      </h2>
      <p className="text-[13.5px] text-slate-400 mb-6">
        Pick at least one method so Mike or the Our Town Properties team can
        follow up.
      </p>

      <div className="space-y-2.5 mb-7">
        {CONSENT_OPTIONS.map((opt) => {
          const checked = values[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              data-testid={opt.testId}
              onClick={() => onToggle(opt.key)}
              aria-pressed={checked}
              className={cn(
                "w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left",
                "transition-all duration-200 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60",
                checked
                  ? "border-gold-400/55 bg-gold-400/[0.07] shadow-[0_2px_12px_rgba(212,160,23,0.08)]"
                  : "border-white/[0.09] bg-[#0B0E14]/70 hover:border-gold-400/28 hover:bg-gold-400/[0.03]"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  checked
                    ? "border-gold-400 bg-gold-400 shadow-[0_0_8px_rgba(212,160,23,0.4)]"
                    : "border-slate-600"
                )}
                aria-hidden="true"
              >
                {checked && (
                  <svg className="h-3 w-3 text-[#0A0A0A]" fill="none" viewBox="0 0 12 12">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <div>
                <p className={cn("text-[14px] font-semibold", checked ? "text-gold-200" : "text-[#F7F1E8]")}>
                  {opt.label}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* TCPA language */}
      <div className="card-gradient-border mb-7">
        <div className="rounded-[15px] bg-[#080808]/60 p-4">
          <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap">
            {CONSENT_LANGUAGE_V1}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Lock className="h-3 w-3 text-slate-600 shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-slate-600">
          Your information is never sold or shared with third parties.
        </p>
      </div>

      <Button
        data-testid="submit-intake"
        variant="primary"
        size="lg"
        onClick={onSubmit}
        disabled={!hasConsent || submitting}
        loading={submitting}
        className="w-full"
      >
        {submitting ? "Sending your info to Mike..." : "Submit — Connect with Mike"}
      </Button>

      <p className="mt-3 text-center text-[11.5px] text-slate-600">
        You must consent to at least one contact method to proceed.
      </p>
    </div>
  );
}
