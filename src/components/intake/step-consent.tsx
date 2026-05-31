"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const CONSENT_LANGUAGE_V1 = `By checking the boxes below, you agree to be contacted by Mike Eatmon and Our Town Properties regarding real estate services. You understand that:

• Your consent to receive SMS text messages, phone calls, and/or emails is not a condition of purchase or service.
• Standard message and data rates may apply for SMS.
• You may opt out at any time by replying STOP (SMS), requesting removal by email, or contacting us directly.
• We will not sell, rent, or share your contact information with third parties for marketing purposes.
• This consent is provided under the Telephone Consumer Protection Act (TCPA).

Our Town Properties, Inc. · Wilson, NC · Licensed Real Estate Broker`;

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
    <div className="pt-8">
      <h2 className="font-display text-3xl font-semibold text-cream mb-2">
        How can Mike contact you?
      </h2>
      <p className="text-slate-400 mb-6">
        Select at least one method so Mike can reach out promptly.
      </p>

      {/* Consent options */}
      <div className="space-y-3 mb-8">
        {CONSENT_OPTIONS.map((opt) => {
          const checked = values[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              data-testid={opt.testId}
              onClick={() => onToggle(opt.key)}
              className={cn(
                "w-full flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                checked
                  ? "border-gold-400/50 bg-gold-400/[0.08]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  checked
                    ? "border-gold-400 bg-gold-400"
                    : "border-slate-500"
                )}
              >
                {checked && (
                  <svg className="h-3 w-3 text-midnight" fill="none" viewBox="0 0 12 12">
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
                <p className={cn("text-sm font-semibold", checked ? "text-gold-300" : "text-cream")}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* TCPA language */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-8">
        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
          {CONSENT_LANGUAGE_V1}
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

      <p className="mt-3 text-center text-xs text-slate-600">
        You must consent to at least one contact method to proceed.
      </p>
    </div>
  );
}
