"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { tryCreateBrowserSubmissionId } from "../../lib/browserSubmissionId";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { publicLeadErrorMessage } from "../../lib/publicLeadErrors";
import { trackEvent } from "../../lib/analytics";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { LeadConsentField } from "./LeadConsentField";
import { LuxuryCard } from "./LuxuryCard";
import { SelectField, TextAreaField, TextField } from "./FormField";

type BuyerIntentSectionProps = {
  surface?: LeadSourceSurface;
  preset?: "buyer" | "renter" | "open_house";
  compact?: boolean;
  propertyId?: string;
  propertyLabel?: string;
};

export function BuyerIntentSection({ surface = "buyer_page", preset = "buyer", compact = false, propertyId, propertyLabel }: BuyerIntentSectionProps) {
  const [attribution] = useState<Attribution>(() => (typeof window === "undefined" ? initialAttribution : readAttribution({
    placement: preset === "open_house" ? "open-house-registration" : undefined,
    placement_id: preset === "open_house" ? `open-house:${propertyId || "unknown"}` : undefined,
    property_id: propertyId,
  })));
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState(false);
  const [contactInvalid, setContactInvalid] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const [leadReference, setLeadReference] = useState<{ leadId: string | null; sessionId: string | null }>({ leadId: null, sessionId: null });

  useEffect(() => setSubmissionId(tryCreateBrowserSubmissionId()), []);

  function clearContactValidation() {
    if (!contactInvalid) return;
    setContactInvalid(false);
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const intent = preset;
    const payload = {
      funnel_type: intent,
      lead_type: intent,
      lead_source_surface: surface,
      name: clean(data.get("buyer-name")),
      email: clean(data.get("buyer-email")),
      phone: clean(data.get("buyer-phone")),
      target_geography: clean(data.get("buyer-area")),
      property_id: propertyId || undefined,
      timeline: clean(data.get("buyer-timeline")),
      financing: clean(data.get("buyer-financing")),
      preapproval: data.get("buyer-preapproval") === "yes",
      question: clean(data.get("buyer-question")),
      consent,
      consent_email: consent,
      consent_call: consent,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: `${surface}:buyer-intake`,
      website: clean(data.get("website")),
      status: "new",
      assigned_agent_id: null,
      widget_session_id: submissionId || undefined,
      attribution,
    };

    if (!payload.email && !payload.phone) {
      setMessage("Add an email or phone number so Mike can follow up.");
      setSuccess(false);
      setContactInvalid(true);
      emailRef.current?.focus();
      return;
    }
    if (!submissionId) {
      setMessage("This browser could not create a secure submission reference. Refresh and try again.");
      setSuccess(false);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setContactInvalid(false);
    trackEvent("funnel_started", attribution, { funnel_name: intent, lead_source_surface: surface });
    trackEvent("contact_submitted", attribution, { funnel_name: intent, lead_source_surface: surface });
    if (consent) trackEvent("consent_accepted", attribution, { funnel_name: intent, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionId },
        body: JSON.stringify({ ...payload, idempotency_key: submissionId }),
      });
      const result = (await response.json()) as { message?: string; error?: string; lead_id?: string; session_id?: string };
      if (!response.ok) throw new Error(publicLeadErrorMessage(result.error));
      const idempotentReplay = response.headers.get("X-AMM-Idempotent-Replay") === "1";
      setMessage(result.message || "Got it. Mike will review your request and follow up.");
      setLeadReference({ leadId: result.lead_id || null, sessionId: result.session_id || submissionId });
      setSuccess(true);
      form.reset();
      setConsent(false);
      setContactInvalid(false);
      setSubmissionId(tryCreateBrowserSubmissionId());
      if (!idempotentReplay) {
        trackEvent("lead_created", attribution, { funnel_name: intent, lead_source_surface: surface });
      }
    } catch (error) {
      setMessage(publicLeadErrorMessage(error instanceof Error ? error.message : undefined));
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }

  const renter = preset === "renter";
  const openHouse = preset === "open_house";
  return (
    <LuxuryCard className={compact ? "p-4" : "p-5 sm:p-7"}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">{openHouse ? "Open-house registration" : renter ? "Renter path" : "Buyer path"}</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
        {openHouse ? `Register interest in ${propertyLabel || "this open house"}.` : renter ? "See what a path from renting to owning could look like." : "Turn your next move into a clear local buying plan."}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">
        Share the basics. Mike or the approved team can review the request and follow up with practical next steps.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" aria-describedby={message ? "buyer-form-status" : undefined}>
        <p
          id="buyer-contact-requirement"
          className={`text-xs leading-5 sm:col-span-2 ${contactInvalid ? "text-[#ffcabd]" : "text-[#b7aa94]"}`}
        >
          Email or phone is required for follow-up. Name, area, and planning details are optional but help Mike prepare.
        </p>
        <TextField name="buyer-name" label="Name" autoComplete="name" placeholder="Your name" />
        <TextField
          name="buyer-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          inputRef={emailRef}
          aria-invalid={contactInvalid || undefined}
          aria-describedby={contactInvalid ? "buyer-contact-requirement buyer-form-status" : "buyer-contact-requirement"}
          onInput={clearContactValidation}
        />
        <TextField
          name="buyer-phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="Phone"
          aria-invalid={contactInvalid || undefined}
          aria-describedby={contactInvalid ? "buyer-contact-requirement buyer-form-status" : "buyer-contact-requirement"}
          onInput={clearContactValidation}
        />
        <TextField name="buyer-area" label={openHouse ? "Property or event location" : renter ? "Target area" : "Target area or property"} placeholder={propertyLabel || "Wilson or Eastern NC"} defaultValue={propertyLabel} />
        <SelectField name="buyer-timeline" label="Timeline" defaultValue="30-60 days">
          <option>ASAP</option><option>30-60 days</option><option>3-6 months</option><option>Just planning</option>
        </SelectField>
        <SelectField name="buyer-financing" label="Financing context" defaultValue="Not sure yet">
          <option>Preapproved</option><option>Working with a lender</option><option>Cash</option><option>Not sure yet</option>
        </SelectField>
        <label className="flex items-center gap-3 text-sm text-[#d9ceb8]">
          <input name="buyer-preapproval" value="yes" type="checkbox" className="h-4 w-4 accent-[#cda24a]" />
          I have a preapproval or lender conversation underway.
        </label>
        <TextAreaField name="buyer-question" label="What would be most helpful?" placeholder="Tell Mike what you are trying to decide." rows={4} className="sm:col-span-2" />
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <LeadConsentField checked={consent} onChange={setConsent} />
        <button disabled={submitting} aria-busy={submitting} className="amm-cyan-button px-5 py-4 disabled:opacity-60 sm:col-span-2">
          {submitting ? "Sending" : openHouse ? "Register for Open House" : renter ? "Request Renter Review" : "Request Buyer Plan"}
        </button>
      </form>
      {message ? (
        <div id="buyer-form-status" className={`mt-4 rounded-md border p-4 text-sm leading-6 ${success ? "border-[#cda24a55] bg-[#cda24a14] text-[#f4ead4]" : "border-[#6e162680] bg-[#6e16261f] text-[#ffcabd]"}`} role={success ? "status" : "alert"} aria-live={success ? "polite" : "assertive"}>
          <p>{message}</p>
          {success && leadReference.leadId ? <div className="mt-4"><AppointmentRequestCTA leadId={leadReference.leadId} sessionId={leadReference.sessionId} requestSurface={surface} funnelName={preset} attribution={attribution} compact /></div> : null}
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[#8f8778]">Availability, financing, and property details require direct confirmation. Not a survey.</p>
    </LuxuryCard>
  );
}
