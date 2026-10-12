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
import { publicLeadOutcomeFromResponse, publicLeadTransportOutcome, type PublicLeadOutcome } from "../../lib/publicLeadReceipt";
import { usePublicIntakeCapability } from "../../lib/publicIntakeCapability";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest, rememberPendingHomeValueRequest } from "../../lib/homeValuePendingRequest";
import { IntakeModeNotice } from "./IntakeModeNotice";
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
type SubmissionStatus = "editing" | "submitting" | "saved" | "not_saved" | "unconfirmed";
type FrozenRequest = { key: string; body: string };

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
  const intakeMode = usePublicIntakeCapability();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const addressRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const frozenRequest = useRef<FrozenRequest | null>(null);
  const inFlight = useRef(false);
  const attempt = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const qaMarkerText = `${name} ${address}`.toUpperCase();
  const hasQaMarkers = qaMarkerText.includes("INTERNAL QA") && qaMarkerText.includes("DO NOT CONTACT");
  const [timeline, setTimeline] = useState(timelineOptions[1]);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<{ message: string; field?: HomeValueField } | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [leadReference, setLeadReference] = useState<{ leadId: string | null; sessionId: string | null }>({
    leadId: null,
    sessionId: null,
  });
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("editing");
  const [restoredPending, setRestoredPending] = useState(false);
  const [recoveryPersistent, setRecoveryPersistent] = useState(true);
  const [receiptReference, setReceiptReference] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [retryPolicy, setRetryPolicy] = useState<"edit" | "same_payload" | "blocked">("edit");
  const [now, setNow] = useState(() => Date.now());
  const submitting = submissionStatus === "submitting";
  const locked = submitting || submissionStatus === "unconfirmed" ||
    (submissionStatus === "not_saved" && retryPolicy !== "edit");
  const experimentProperties = experimentContext
    ? { experiment_key: experimentContext.experimentKey, variant_key: experimentContext.variantKey }
    : {};
  const experimentLeadContext = publicExperimentLeadFields(experimentContext);
  const eventOptions = { sessionId: submissionId };

  useEffect(() => {
    const pending = readPendingHomeValueRequest();
    if (pending) {
      setSubmissionId(pending.key);
      setReceiptReference(pending.key);
      setRestoredPending(true);
      setSubmissionStatus("unconfirmed");
      setRetryPolicy("blocked");
      setFormError({ message: "An earlier request in this tab has not been confirmed. Its reference is retained, but your private form details were not stored. Ask Our Town Properties to check that request before starting another." });
    } else setSubmissionId(tryCreateBrowserSubmissionId());
    mounted.current = true;
    // bfcache keeps the in-memory key/payload; it is not durable storage.
    // A interrupted request may already have committed. Never generate another
    // key or turn the interrupted page into an editable fresh submission.
    const interrupt = () => {
      if (!inFlight.current || !frozenRequest.current) return;
      attempt.current += 1;
      controller.current?.abort();
      inFlight.current = false;
      setSubmissionStatus("unconfirmed");
      setRetryPolicy("same_payload");
      setFormError({ message: "Save not confirmed. Keep this page open. Your details and request reference are retained here; do not start another request." });
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) interrupt(); };
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("pageshow", restore);
    return () => {
      mounted.current = false;
      attempt.current += 1;
      controller.current?.abort();
      window.removeEventListener("pagehide", interrupt);
      window.removeEventListener("pageshow", restore);
    };
  }, []);

  useEffect(() => {
    if (step === 2) nameRef.current?.focus();
    if (step === 3) successRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function rememberContact(form: HTMLFormElement) {
    const data = new FormData(form);
    const field = (key: string) => String(data.get(key) ?? "");
    const values = { name: field("name"), email: field("email"), phone: field("phone"), timeline: field("timeline"), consent: data.get("consent") === "yes" };
    // Mounted contact controls own their values so eventless autofill survives
    // unrelated rerenders. Snapshot them to seed defaults when this step remounts.
    setName(values.name); setEmail(values.email); setPhone(values.phone);
    setTimeline(values.timeline); setConsent(values.consent);
    return values;
  }

  function clearKnownRefusal() {
    if (submissionStatus === "not_saved" && retryPolicy === "edit") {
      if (frozenRequest.current) clearPendingHomeValueRequest(frozenRequest.current.key);
      frozenRequest.current = null;
      setSubmissionStatus("editing");
      setRetryAt(null);
    }
    setFormError(null);
  }

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setFormError(null);
    const actualAddress = String(new FormData(event.currentTarget).get("address") ?? address);
    setAddress(actualAddress);
    if (clean(actualAddress).length < 5) {
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
    if (inFlight.current || locked || (retryAt !== null && Date.now() < retryAt)) return;
    const actual = rememberContact(event.currentTarget);
    setFormError(null);
    setLeadMessage(null);
    if (intakeMode === "checking" || intakeMode === "read_only") {
      setFormError({ message: "Preview only. Entries here are not saved. Open the live Home Value form to send a request." });
      return;
    }
    if (intakeMode === "synthetic_qa" &&
      (!actual.name.toUpperCase().includes("INTERNAL QA") || !actual.name.toUpperCase().includes("DO NOT CONTACT") ||
        !clean(actual.email).toLowerCase().endsWith("@example.test"))) {
      setFormError({ message: "Synthetic QA only: use an INTERNAL QA / DO NOT CONTACT name and an example.test email. Do not enter personal contact details here." });
      return;
    }
    if (clean(actual.name).length < 2) {
      setFormError({
        message: "Enter your name so Mike knows who requested the review.",
        field: "name",
      });
      nameRef.current?.focus();
      return;
    }
    if (!isValidLeadEmail(clean(actual.email))) {
      setFormError({
        message: "Enter a valid email for your valuation follow-up.",
        field: "email",
      });
      emailRef.current?.focus();
      return;
    }
    if (clean(actual.phone) && !isValidLeadPhone(clean(actual.phone))) {
      setFormError({ message: "Enter a phone number with area code.", field: "phone" });
      phoneRef.current?.focus();
      return;
    }
    if (!submissionId) {
      setFormError({ message: "This browser could not create a secure submission reference. Refresh and try again." });
      return;
    }

    frozenRequest.current = { key: submissionId, body: JSON.stringify({
      funnel_type: surface === "widget" ? "widget" : "home_value",
      lead_source_surface: surface,
      address: clean(address), name: clean(actual.name), email: clean(actual.email), phone: clean(actual.phone),
      timeline: actual.timeline, status: "new", assigned_agent_id: null,
      widget_session_id: submissionId, idempotency_key: submissionId,
      ...(experimentLeadContext || {}),
      consent: actual.consent, consent_email: actual.consent,
      consent_call: actual.consent && Boolean(clean(actual.phone)),
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: `${surface}:home-value`, attribution,
    }) };
    trackEvent("email_submit", attribution, { funnel_name: "home_value", step_name: "contact" }, eventOptions);
    if (clean(actual.phone)) {
      trackEvent("phone_submit", attribution, { funnel_name: "home_value", step_name: "contact" }, eventOptions);
    }
    trackEvent("timeline_selected", attribution, { funnel_name: "home_value", timeline: actual.timeline }, eventOptions);
    trackEvent("contact_submitted", attribution, { funnel_name: "home_value", lead_source_surface: surface, step_name: "contact" }, eventOptions);
    if (actual.consent) trackEvent("consent_accepted", attribution, { funnel_name: "home_value", consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION }, eventOptions);

    await sendFrozenRequest();
  }

  async function sendFrozenRequest() {
    const request = frozenRequest.current;
    if (!request || inFlight.current || (retryAt !== null && Date.now() < retryAt)) return;
    if (intakeMode !== "live" && intakeMode !== "synthetic_qa") return;
    setRecoveryPersistent(rememberPendingHomeValueRequest(request.key));
    setReceiptReference(request.key);
    inFlight.current = true;
    setSubmissionStatus("submitting");
    setFormError(null);
    const token = ++attempt.current;
    const abort = new AbortController();
    controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 30_000);
    let outcome: PublicLeadOutcome;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": request.key },
        body: request.body,
        signal: abort.signal,
      });
      outcome = await publicLeadOutcomeFromResponse(res);
      if (outcome.status === "saved" && outcome.receipt.session_id !== request.key.toLowerCase()) {
        outcome = publicLeadTransportOutcome();
      }
    } catch {
      outcome = publicLeadTransportOutcome(abort.signal.aborted ? "timeout" : "transport_error");
    } finally {
      window.clearTimeout(timer);
    }
    // A late response from a suspended/unmounted page cannot advance a newer
    // attempt, replace its payload, or fabricate a saved confirmation.
    if (!mounted.current || token !== attempt.current) return;
    inFlight.current = false;
    controller.current = null;
    if (outcome.status === "saved") {
      const data = outcome.receipt;
      clearPendingHomeValueRequest(request.key);
      setSubmissionStatus("saved");
      setRetryAt(null);
      if (!data.idempotentReplay && !data.duplicate_of_lead_id) {
        trackEvent("lead_created", attribution, { funnel_name: "home_value", step_name: "thank_you", ...experimentProperties }, eventOptions);
        if (surface === "widget") {
          trackEvent("widget_lead_created", attribution, { funnel_name: "home_value" }, eventOptions);
          postToWidgetParent({ type: "askmagicmike:lead_created" }, attribution);
        }
      }
      setLeadMessage(data.message);
      setReceiptReference(data.correlation_id);
      setLeadReference({ leadId: data.lead_id, sessionId: data.session_id });
      setStep(3);
      trackEvent("thank_you_viewed", attribution, { funnel_name: "home_value" }, eventOptions);
    } else {
      if (outcome.status === "not_saved" && outcome.retryPolicy === "edit") clearPendingHomeValueRequest(request.key);
      setSubmissionStatus(outcome.status);
      setRetryPolicy(outcome.retryPolicy);
      if (outcome.status === "not_saved" && outcome.retryAfter) {
        setRetryAt(Date.parse(outcome.retryAfter.retryAt));
        setNow(Date.now());
      }
      setFormError({ message: outcome.message });
      if (outcome.correlation_id) setReceiptReference(outcome.correlation_id);
      trackEvent("lead_submit_failed", attribution, {
        funnel_name: "home_value",
        lead_source_surface: surface,
        step_name: "contact",
      }, eventOptions);
    }
  }

  return (
    <LuxuryCard className={`amm-home-value min-w-0 [overflow-wrap:anywhere] ${compact ? "p-4" : "p-5 sm:p-7"}`}>
      <IntakeModeNotice mode={intakeMode} className="mb-4" />
      <div role="status" aria-live="polite" className="sr-only">{submissionStatus === "submitting" ? "Saving your request" : submissionStatus === "unconfirmed" ? "Save not confirmed" : submissionStatus === "not_saved" ? "Request not saved" : ""}</div>
      <ProgressBar step={step} labels={stepLabels} />

      {step === 1 ? (
        <form noValidate onSubmit={submitAddress} className="space-y-5" data-amm-step="address">
          <TextField
            label="Property address"
            name="address"
            inputRef={addressRef}
            defaultValue={address}
            onChange={(event) => {
              setAddress(event.target.value);
              clearKnownRefusal();
            }}
            autoComplete="street-address"
            maxLength={500}
            disabled={intakeMode === "checking" || locked}
            placeholder="123 Lake Wilson Road, Wilson, NC"
            aria-describedby={formError?.field === "address" ? errorId : undefined}
            aria-invalid={formError?.field === "address"}
            required
          />
          <button disabled={intakeMode === "checking" || locked} className="amm-primary-button w-full px-5 py-4 disabled:opacity-60">
            Continue
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form noValidate onSubmit={submitContact} className="space-y-5" data-amm-step="contact">
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[#cda24a33] bg-black/30 p-3">
            <p className="min-w-0 flex-1 break-words text-sm text-[#f4ead4]"><span className="block text-xs text-[#b7aa94]">Property address</span>{address}</p>
            <button type="button" disabled={locked} onClick={(event) => {
              rememberContact(event.currentTarget.form!);
              setFormError(null); setStep(1);
            }} className="min-h-11 px-3 text-sm font-semibold text-[#e2c06f] underline disabled:opacity-60">Edit address</button>
          </div>
          <TextField
            label="Your name"
            name="name"
            inputRef={nameRef}
            defaultValue={name}
            onChange={(event) => {
              setName(event.target.value);
              clearKnownRefusal();
            }}
            autoComplete="name"
            maxLength={160}
            disabled={locked}
            placeholder="Your name"
            aria-describedby={formError?.field === "name" ? errorId : undefined}
            aria-invalid={formError?.field === "name"}
            required
          />
          <TextField
            label="Email for your valuation follow-up"
            name="email"
            inputRef={emailRef}
            defaultValue={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearKnownRefusal();
            }}
            type="email"
            inputMode="email"
            maxLength={320}
            disabled={locked}
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={formError?.field === "email" ? errorId : undefined}
            aria-invalid={formError?.field === "email"}
            required
          />
          <TextField
            label="Phone (optional)"
            name="phone"
            inputRef={phoneRef}
            defaultValue={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearKnownRefusal();
            }}
            type="tel"
            inputMode="tel"
            maxLength={40}
            disabled={locked}
            autoComplete="tel"
            placeholder="252-555-0123"
            aria-describedby={formError?.field === "phone" ? errorId : undefined}
            aria-invalid={formError?.field === "phone"}
          />
          <SelectField label="Timeline" name="timeline" disabled={locked} defaultValue={timeline} onChange={(event) => setTimeline(event.target.value)}>
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
          <fieldset disabled={locked} className="min-w-0"><legend className="sr-only">Contact permission</legend><LeadConsentField checked={consent} onChange={setConsent} /></fieldset>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={locked}
              onClick={(event) => {
                rememberContact(event.currentTarget.form!);
                setFormError(null);
                setStep(1);
              }}
              className="amm-secondary-button px-5 py-4"
            >
              Back
            </button>
            <button disabled={locked || intakeMode === "checking" || (retryAt !== null && now < retryAt)} aria-busy={submitting} className="amm-primary-button min-h-11 flex-1 px-5 py-4 disabled:opacity-60">
              {submitting ? "Submitting" : intakeMode === "read_only" ? "Review demo (not saved)" : "Request Valuation"}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5" data-amm-step="thank-you">
          <h3 ref={successRef} tabIndex={-1} className="font-serif text-3xl text-[#f4ead4]">Your request is in.</h3>
          {receiptReference ? <p className="break-words text-sm text-[#d9ceb8]">Saved request reference: <span className="select-text font-mono">{receiptReference}</span></p> : null}
          <p className="text-[#d9ceb8]">
            {hasQaMarkers ? "Your labeled troubleshooting request is stored for internal review. This confirmation does not create consumer contact or an appointment." : leadMessage || "Mike will review the property details and follow up with practical next steps."}
          </p>
          <div className="rounded-md border border-[#cda24a33] bg-black/35 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">
              What happens next
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#d9ceb8]">
              {hasQaMarkers ? <>
                <li>The approved team can inspect the saved request and its retained inputs.</li>
                <li>Keep the request reference for that review; do not submit it again.</li>
                <li>The INTERNAL QA / DO NOT CONTACT markers remain part of this request.</li>
              </> : <>
                <li>Mike reviews the address and timing you shared.</li>
                <li>Our Town Properties follows up through your provided contact path.</li>
                <li>You can request a conversation now if you want a faster handoff.</li>
              </>}
            </ul>
          </div>
          {!hasQaMarkers ? <AppointmentRequestCTA
            leadId={leadReference.leadId}
            sessionId={leadReference.sessionId}
            requestSurface={surface}
            funnelName="home_value"
            attribution={attribution}
          /> : <p className="text-sm text-[#d9ceb8]">Marked INTERNAL QA — DO NOT CONTACT. This test request does not create an appointment or consumer outreach.</p>}
          <p className="text-sm leading-6 text-[#d9ceb8]">
            Prefer a direct call? Our Town Properties can be reached through the contact information on ourtownproperties.com.
          </p>
          <p className="text-xs leading-5 text-[#8f8778]">This is broker-reviewed guidance, not an automated appraisal. Not a survey.</p>
        </div>
      ) : null}

      {formError ? (
        <div className="mt-4 rounded-md border border-[#6e162680] bg-[#6e16261f] p-3 text-sm text-[#ffcabd]">
          <p id={errorId} role="alert">{formError.message}</p>
          {locked && !submitting && !restoredPending ? <p className="mt-2">Keep this page open. Your original details and request reference have not been changed. Do not refresh to start another request.</p> : null}
          {!recoveryPersistent && !restoredPending && submissionStatus !== "saved" ? <p className="mt-2">This browser could not retain the recovery reference across a reload. Keep this page open and save the reference below for Our Town Properties to check.</p> : null}
          {retryAt && now < retryAt ? <p role="status" className="mt-2">Wait {Math.max(1, Math.ceil((retryAt-now)/1000))} seconds before retrying this same request.</p> : null}
          {retryPolicy === "same_payload" && frozenRequest.current && !submitting ? <button type="button" disabled={retryAt !== null && now < retryAt} onClick={() => void sendFrozenRequest()} className="amm-secondary-button mt-3 min-h-11 w-full px-4 py-3 disabled:opacity-60">Retry identical request</button> : null}
          {receiptReference ? <p className="mt-2 break-words">Request reference: <span className="select-text font-mono">{receiptReference}</span></p> : null}
        </div>
      ) : null}
    </LuxuryCard>
  );
}
