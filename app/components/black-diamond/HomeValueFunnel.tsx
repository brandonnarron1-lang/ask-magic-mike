"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { tryCreateBrowserSubmissionId } from "../../lib/browserSubmissionId";
import { timelineOptions } from "../../lib/constants";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { isValidLeadEmail, isValidLeadPhone } from "../../lib/leadContactValidation";
import {
  publicExperimentLeadFields,
  type PublicExperimentContext,
} from "../../lib/growth/experiment-registry";
import { publicLeadErrorMessage } from "../../lib/publicLeadErrors";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { postToWidgetParent } from "../../lib/widgetMessaging";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { LuxuryCard } from "./LuxuryCard";
import { ProgressBar } from "./ProgressBar";
import { SelectField, TextField } from "./FormField";
import { LeadConsentField } from "./LeadConsentField";

type HomeValueFunnelProps = {
  surface?: LeadSourceSurface;
  compact?: boolean;
  attributionOverrides?: Partial<Attribution>;
  experimentContext?: PublicExperimentContext | null;
};

type HomeValueField = "address" | "name" | "email" | "phone";

const stepLabels = ["Address", "Contact", "Thank you"];
const errorId = "home-value-form-error";

export function HomeValueFunnel({
  surface = "home_value_page",
  compact = false,
  attributionOverrides = {},
  experimentContext = null,
}: HomeValueFunnelProps) {
  const [attribution] = useState<Attribution>(() =>
    typeof window === "undefined" ? initialAttribution : readAttribution(attributionOverrides),
  );
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const addressRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState(timelineOptions[1]);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<{ message: string; field?: HomeValueField } | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [leadReference, setLeadReference] = useState<{ leadId: string | null; sessionId: string | null }>({
    leadId: null,
    sessionId: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const experimentProperties = experimentContext
    ? { experiment_key: experimentContext.experimentKey, variant_key: experimentContext.variantKey }
    : {};
  const experimentLeadContext = publicExperimentLeadFields(experimentContext);
  const eventOptions = { sessionId: submissionId };

  useEffect(() => {
    setSubmissionId(tryCreateBrowserSubmissionId());
  }, []);

  useEffect(() => {
    if (step === 2) nameRef.current?.focus();
  }, [step]);

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (clean(address).length < 5) {
      setFormError({
        message: "Enter the full property address so Mike can review the right home.",
        field: "address",
      });
      addressRef.current?.focus();
      return;
    }
    // Passive effects normally create this identifier before a person can
    // interact. Recover synchronously as well so an unusually fast first tap
    // cannot create unlinked address-stage telemetry.
    const activeSubmissionId = submissionId ?? tryCreateBrowserSubmissionId();
    if (!activeSubmissionId) {
      setFormError({
        message: "This browser could not create a secure submission reference. Refresh and try again.",
        field: "address",
      });
      addressRef.current?.focus();
      return;
    }
    if (!submissionId) setSubmissionId(activeSubmissionId);
    const addressEventOptions = { sessionId: activeSubmissionId };
    trackEvent("home_value_started", attribution, { funnel_name: "home_value", lead_source_surface: surface, ...experimentProperties }, addressEventOptions);
    trackEvent("funnel_started", attribution, { funnel_name: "home_value", lead_source_surface: surface, ...experimentProperties }, addressEventOptions);
    trackEvent("address_submit", attribution, { funnel_name: "home_value", step_name: "address", ...experimentProperties }, addressEventOptions);
    trackEvent("address_submitted", attribution, { funnel_name: "home_value", step_name: "address", ...experimentProperties }, addressEventOptions);
    if (surface === "widget") {
      postToWidgetParent({ type: "askmagicmike:lead_started" }, attribution);
    }
    setStep(2);
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setLeadMessage(null);
    if (clean(name).length < 2) {
      setFormError({
        message: "Enter your name so Mike knows who requested the review.",
        field: "name",
      });
      nameRef.current?.focus();
      return;
    }
    if (!isValidLeadEmail(clean(email))) {
      setFormError({
        message: "Enter a valid email for your valuation follow-up.",
        field: "email",
      });
      emailRef.current?.focus();
      return;
    }
    if (clean(phone) && !isValidLeadPhone(clean(phone))) {
      setFormError({ message: "Enter a phone number with area code.", field: "phone" });
      phoneRef.current?.focus();
      return;
    }
    if (!submissionId) {
      setFormError({ message: "This browser could not create a secure submission reference. Refresh and try again." });
      return;
    }

    setSubmitting(true);
    trackEvent("email_submit", attribution, { funnel_name: "home_value", step_name: "contact" }, eventOptions);
    if (clean(phone)) {
      trackEvent("phone_submit", attribution, { funnel_name: "home_value", step_name: "contact" }, eventOptions);
    }
    trackEvent("timeline_selected", attribution, { funnel_name: "home_value", timeline }, eventOptions);
    trackEvent("contact_submitted", attribution, { funnel_name: "home_value", lead_source_surface: surface, step_name: "contact" }, eventOptions);
    if (consent) trackEvent("consent_accepted", attribution, { funnel_name: "home_value", consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION }, eventOptions);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionId },
        body: JSON.stringify({
          funnel_type: surface === "widget" ? "widget" : "home_value",
          lead_source_surface: surface,
          address: clean(address),
          name: clean(name),
          email: clean(email),
          phone: clean(phone),
          timeline,
          status: "new",
          assigned_agent_id: null,
          widget_session_id: submissionId,
          idempotency_key: submissionId,
          ...(experimentLeadContext || {}),
          consent,
          consent_email: consent,
          consent_call: consent && Boolean(clean(phone)),
          consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
          consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
          consent_source: `${surface}:home-value`,
          attribution,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        lead_id?: string | null;
        session_id?: string | null;
      };
      if (!res.ok) throw new Error(publicLeadErrorMessage(data.error));
      const idempotentReplay = res.headers.get("X-AMM-Idempotent-Replay") === "1";
      if (!idempotentReplay) {
        trackEvent("lead_created", attribution, { funnel_name: "home_value", step_name: "thank_you", ...experimentProperties }, eventOptions);
        if (surface === "widget") {
          trackEvent("widget_lead_created", attribution, { funnel_name: "home_value" }, eventOptions);
          postToWidgetParent({ type: "askmagicmike:lead_created" }, attribution);
        }
      }
      setLeadMessage(
        data.message ||
          "Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.",
      );
      setLeadReference({ leadId: data.lead_id || null, sessionId: data.session_id || null });
      setStep(3);
      trackEvent("thank_you_viewed", attribution, { funnel_name: "home_value" }, eventOptions);
    } catch (error) {
      trackEvent("lead_submit_failed", attribution, {
        funnel_name: "home_value",
        lead_source_surface: surface,
        step_name: "contact",
      }, eventOptions);
      setFormError({ message: publicLeadErrorMessage(error instanceof Error ? error.message : undefined) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LuxuryCard className={compact ? "p-4" : "p-5 sm:p-7"}>
      <ProgressBar step={step} labels={stepLabels} />

      {step === 1 ? (
        <form noValidate onSubmit={submitAddress} className="space-y-5" data-amm-step="address">
          <TextField
            label="Property address"
            inputRef={addressRef}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              if (formError) setFormError(null);
            }}
            autoComplete="street-address"
            placeholder="123 Lake Wilson Road, Wilson, NC"
            aria-describedby={formError?.field === "address" ? errorId : undefined}
            aria-invalid={formError?.field === "address"}
            required
          />
          <button className="amm-primary-button w-full px-5 py-4">
            Continue
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form noValidate onSubmit={submitContact} className="space-y-5" data-amm-step="contact">
          <TextField
            label="Your name"
            inputRef={nameRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (formError) setFormError(null);
            }}
            autoComplete="name"
            placeholder="Your name"
            aria-describedby={formError?.field === "name" ? errorId : undefined}
            aria-invalid={formError?.field === "name"}
            required
          />
          <TextField
            label="Email for your valuation follow-up"
            inputRef={emailRef}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (formError) setFormError(null);
            }}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={formError?.field === "email" ? errorId : undefined}
            aria-invalid={formError?.field === "email"}
            required
          />
          <TextField
            label="Phone (optional)"
            inputRef={phoneRef}
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              if (formError) setFormError(null);
            }}
            type="tel"
            autoComplete="tel"
            placeholder="252-555-0123"
            aria-describedby={formError?.field === "phone" ? errorId : undefined}
            aria-invalid={formError?.field === "phone"}
          />
          <SelectField label="Timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)}>
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
          <LeadConsentField checked={consent} onChange={setConsent} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setStep(1);
              }}
              className="amm-secondary-button px-5 py-4"
            >
              Back
            </button>
            <button disabled={submitting} aria-busy={submitting} className="amm-primary-button flex-1 px-5 py-4 disabled:opacity-60">
              {submitting ? "Submitting" : "Request Valuation"}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5" data-amm-step="thank-you">
          <h3 className="font-serif text-3xl text-[#f4ead4]">Your request is in.</h3>
          <p className="text-[#d9ceb8]">
            {leadMessage || "Mike will review the property details and follow up with practical next steps."}
          </p>
          <div className="rounded-md border border-[#cda24a33] bg-black/35 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">
              What happens next
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#d9ceb8]">
              <li>Mike reviews the address and timing you shared.</li>
              <li>Our Town Properties follows up through your provided contact path.</li>
              <li>You can request a conversation now if you want a faster handoff.</li>
            </ul>
          </div>
          <AppointmentRequestCTA
            leadId={leadReference.leadId}
            sessionId={leadReference.sessionId}
            requestSurface={surface}
            funnelName="home_value"
            attribution={attribution}
          />
          <p className="text-sm leading-6 text-[#d9ceb8]">
            Prefer a direct call? Our Town Properties can be reached through the contact information on ourtownproperties.com.
          </p>
          <p className="text-xs leading-5 text-[#8f8778]">This is broker-reviewed guidance, not an automated appraisal. Not a survey.</p>
        </div>
      ) : null}

      {formError ? (
        <p id={errorId} className="mt-4 rounded-md border border-[#6e162680] bg-[#6e16261f] p-3 text-sm text-[#ffcabd]" role="alert">
          {formError.message}
        </p>
      ) : null}
    </LuxuryCard>
  );
}
