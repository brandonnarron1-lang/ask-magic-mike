"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { AddressEntry } from "./AddressEntry";
import { useIntakeEngagement } from "../../lib/client/useIntakeEngagement";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { SelectField, TextAreaField, TextField } from "./FormField";
import { LeadConsentField } from "./LeadConsentField";
import { LuxuryCard } from "./LuxuryCard";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { MissingAddressStreetError, type AddressValue } from "../../lib/address/addressValue";
import { trackEvent } from "../../lib/analytics";
import { usePublicIntakeRecovery } from "../../lib/client/publicIntakeRecovery";
import { conditionOptions, timelineOptions } from "../../lib/constants";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import type { LeadSourceSurface } from "../../lib/leadPayload";
import { usePublicIntakeCapability } from "../../lib/publicIntakeCapability";
import { readSellerOptionsForm, SELLER_OPTIONS, sellerOptionsFingerprint, sellerOptionsQuestion, SellerOptionsInputError,
  type SellerOption, type SellerOptionsReview } from "../../lib/sellerOptions";

export function SellerOptionsRequest({ surface, compact, initialOption }: {
  surface: LeadSourceSurface; compact: boolean; initialOption: SellerOption;
}) {
  const [attribution] = useState(() => typeof window === "undefined" ? initialAttribution : readAttribution());
  const mode = usePublicIntakeCapability();
  const recovery = usePublicIntakeRecovery();
  const recordEngagement = useIntakeEngagement(attribution, "seller", surface, recovery.key);
  const addressRef = useRef<HTMLInputElement>(null);
  const [addressValue, setAddressValue] = useState<AddressValue | null>(null);
  const [review, setReview] = useState<SellerOptionsReview | null>(null);
  const committedReview = useRef("");
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [qa, setQa] = useState(false);
  const saved = recovery.state.status === "saved" ? recovery.state.receipt : null;
  const busy = recovery.state.status === "submitting";
  useLayoutEffect(() => {
    committedReview.current = review ? sellerOptionsFingerprint(review) : "";
    if (review) reviewRef.current?.focus();
  }, [review]);
  function edited() {
    if (recovery.locked || recovery.isBusy()) return;
    setReview(null); setError(null); recovery.clearEditableFailure();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recovery.locked || recovery.isBusy()) return;
    const form = event.currentTarget;
    setError(null);
    let actual: SellerOptionsReview;
    try { actual = readSellerOptionsForm(form, addressValue); }
    catch (caught) {
      const problem = caught instanceof SellerOptionsInputError ? caught
        : new SellerOptionsInputError("address", caught instanceof MissingAddressStreetError
          ? "Add a street address before the other address fields." : "Review the property address before continuing.");
      setError(problem.message);
      const field = form.elements.namedItem(problem.field);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    if (mode !== "live" && mode !== "synthetic_qa") { setError("Preview only. Entries here are not saved. Open the live form to send a request."); return; }
    if (mode === "synthetic_qa" && (!actual.name.toUpperCase().includes("INTERNAL QA") ||
      !actual.name.toUpperCase().includes("DO NOT CONTACT") || !actual.email.toLowerCase().endsWith("@example.test"))) {
      setError("Synthetic QA only: use an INTERNAL QA / DO NOT CONTACT name and an example.test email. Do not enter personal contact details here."); return;
    }
    if (!recovery.key) { setError("This browser could not create a secure submission reference. Refresh and try again."); return; }
    if (sellerOptionsFingerprint(actual) !== committedReview.current) {
      // Reconcile the native fields with the address just shown for review.
      // Otherwise unchanged old street fields can alternate with a new native
      // autofill value on each click, preventing a stable final confirmation.
      if (addressRef.current) addressRef.current.value = actual.address.acceptedText;
      const addressFields = { address_line1: "line1", address_line2: "line2", address_city: "locality",
        address_region: "region", address_postal: "postalCode", address_country: "country" } as const;
      for (const [name, key] of Object.entries(addressFields)) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = actual.address.components[key];
      }
      setReview(actual); setAddressValue(actual.address);
      if (review) setError("Your details changed. Review the updated request before sending.");
      return;
    }
    const question = sellerOptionsQuestion(actual);
    setQa(/INTERNAL QA|DO NOT CONTACT/.test([actual.name, actual.address.acceptedText, actual.context].join(" ").toUpperCase()));
    const payload = { funnel_type: "seller", lead_source_surface: surface, address: actual.address.acceptedText,
      address_entry: actual.address, name: actual.name, email: actual.email, phone: actual.phone,
      condition: actual.condition || undefined, timeline: actual.timeline || undefined, question,
      consent: actual.consent, consent_email: actual.consent && Boolean(actual.email), consent_call: actual.consent && Boolean(actual.phone),
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_source: `${surface}:seller-intake`, website: actual.website, status: "new", assigned_agent_id: null,
      widget_session_id: recovery.key, idempotency_key: recovery.key, attribution };
    const eventOptions = { sessionId: recovery.key };
    trackEvent("seller_form_submit", attribution, { funnel_name: "seller", lead_source_surface: surface, step_name: "seller_intent" }, eventOptions);
    const outcome = await recovery.start(JSON.stringify(payload));
    if (outcome?.status === "saved") {
      if (!outcome.receipt.idempotentReplay && !outcome.receipt.duplicate_of_lead_id)
        trackEvent("lead_created", attribution, { funnel_name: "seller", lead_source_surface: surface }, eventOptions);
      trackEvent("thank_you_viewed", attribution, { funnel_name: "seller" }, eventOptions);
    }
  }
  const stateMessage = saved?.message || (recovery.restored ? "An earlier request has not been confirmed. Retain its reference and ask Our Town Properties to check it before starting another."
    : "message" in recovery.state ? recovery.state.message : null);
  return <LuxuryCard className={`min-w-0 [overflow-wrap:anywhere] ${compact ? "p-4" : "p-5 sm:p-7"}`}>
    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Our Town Properties · Seller options</p>
    <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">Explore your selling options.</h2>
    <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">Request a property review with Mike Eatmon. Compare the paths before deciding how to sell.</p>
    <form noValidate onSubmit={submit} onInputCapture={recordEngagement} onChangeCapture={recordEngagement} onInput={edited} onChange={edited} className="mt-6" aria-describedby="seller-options-status">
      <fieldset disabled={recovery.locked} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Property review request</legend>
        <SelectField name="seller-option" label="Selling goal" defaultValue={initialOption} className="sm:col-span-2">
          {Object.entries(SELLER_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
        <div className="sm:col-span-2"><AddressEntry inputRef={addressRef} value={addressValue} initialText="" disabled={recovery.locked}
          onChange={edited} onAccept={setAddressValue} /></div>
        <TextField name="seller-name" label="Name" required autoComplete="name" maxLength={160} />
        <TextField name="seller-email" label="Email" type="email" autoComplete="email" maxLength={254} aria-describedby="seller-options-contact" />
        <TextField name="seller-phone" label="Phone" type="tel" autoComplete="tel" maxLength={40} aria-describedby="seller-options-contact" />
        <p id="seller-options-contact" className="text-sm leading-6 text-[#d9ceb8] sm:col-span-2">Provide at least one: email or phone. Permission to contact is optional.</p>
        <SelectField name="condition" label="Condition (optional)" defaultValue=""><option value="">Select condition</option>{conditionOptions.map(value => <option key={value}>{value}</option>)}</SelectField>
        <SelectField name="seller-timeline" label="Timeline (optional)" defaultValue=""><option value="">Select timeline</option>{timelineOptions.map(value => <option key={value}>{value}</option>)}</SelectField>
        <TextAreaField name="seller-context" label="Additional context (optional)" maxLength={2000} rows={3} className="sm:col-span-2" />
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <LeadConsentField />
        {review ? <section role="region" aria-label="Review your property request" className="space-y-2 rounded-md border border-[#cda24a55] p-4 text-sm leading-6 sm:col-span-2">
          <h3 ref={reviewRef} tabIndex={-1} className="font-semibold">Review your property request</h3>
          <p>{SELLER_OPTIONS[review.option]}</p><p className="select-text">{review.address.acceptedText}</p>
          <p className="select-text">{review.name} · {review.email || "Email not provided"} · {review.phone || "Phone not provided"}</p>
          <p>{review.condition || "Condition not provided"} · {review.timeline || "Timeline not provided"}</p>
          {review.context ? <p className="whitespace-pre-wrap">{review.context}</p> : null}
          <p>{review.consent ? "Permission granted for the provided email/phone channels." : "Permission declined. This request can still be saved for review."}</p>
          <p>Address entered or confirmed by you; postal, ownership and property verification have not been performed.</p>
        </section> : null}
        <button disabled={busy || mode === "checking"} aria-busy={busy} className="amm-primary-button min-h-11 px-5 py-4 disabled:opacity-60 sm:col-span-2">
          {busy ? "Saving request…" : review ? "Send property review request" : "Review property request"}
        </button>
      </fieldset>
    </form>
    <div id="seller-options-status" role="status" aria-live="polite" className="mt-4 space-y-3 text-sm leading-6">
      {error || stateMessage ? <p>{error || stateMessage}</p> : null}
      {recovery.key && recovery.locked ? <p className="select-text break-words">Request reference: {saved?.correlation_id || recovery.key}</p> : null}
      {recovery.locked && !saved && !busy ? <p>Keep this page open. Do not start another request while this one is unresolved.</p> : null}
      {!recovery.persistent && recovery.locked && !saved ? <p>Your browser cannot retain the reference across a reload. Keep this page open and save the reference for Our Town Properties to check.</p> : null}
      {recovery.retrySeconds > 0 ? <p>Wait {recovery.retrySeconds} seconds before retrying this same request.</p> : null}
      {recovery.canRetry ? <button type="button" disabled={recovery.retrySeconds > 0 || (mode !== "live" && mode !== "synthetic_qa")}
        onClick={() => void recovery.retry()} className="amm-secondary-button min-h-11 px-4 py-3 disabled:opacity-60">Retry identical request</button> : null}
    </div>
    {saved && !qa ? <AppointmentRequestCTA leadId={saved.lead_id} sessionId={saved.session_id} requestSurface={surface} funnelName="seller" attribution={attribution} compact /> : null}
    {saved && qa ? <p className="mt-3 text-sm">INTERNAL QA — DO NOT CONTACT. No appointment or consumer outreach is created.</p> : null}
    <p className="mt-4 text-sm leading-6 text-[#b7aa94]">A review request is not an offer, appraisal, financing approval or closing commitment. No valuation, cash terms, fees or response time are promised.</p>
  </LuxuryCard>;
}
