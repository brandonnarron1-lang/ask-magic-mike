"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { usePublicIntakeCapability } from "../../lib/publicIntakeCapability";
import { usePublicIntakeRecovery } from "../../lib/client/publicIntakeRecovery";
import { buyerHasQaMarkers, buyerReviewFingerprint, IntakeReviewError, readBuyerForm, type BuyerFormSnapshot } from "../../lib/client/publicIntakeReview";
import type { PublicLeadOutcome } from "../../lib/publicLeadReceipt";
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
  attributionOverrides?: Partial<Attribution>;
};

export function BuyerIntentSection({ surface = "buyer_page", preset = "buyer", compact = false, propertyId, propertyLabel, attributionOverrides }: BuyerIntentSectionProps) {
  const [attribution] = useState<Attribution>(() => {
    // Omitted defaults must not erase independent standalone URL claims.
    const defaults: Partial<Attribution> = {
      ...(preset === "open_house" ? { placement: "open-house-registration", placement_id: "open-house:" + (propertyId || "unknown") } : {}),
      ...(propertyId ? { property_id: propertyId } : {}),
    };
    const overrides = { ...defaults, ...attributionOverrides };
    return typeof window === "undefined" ? { ...initialAttribution, ...overrides } : readAttribution(overrides);
  });
  const intakeMode = usePublicIntakeCapability();
  const recovery = usePublicIntakeRecovery();
  const [kind, setKind] = useState<"specific" | "search">("specific");
  const [review, setReview] = useState<BuyerFormSnapshot | null>(null);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const committedReview = useRef("");
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const savedRef = useRef<HTMLHeadingElement>(null);
  const renter = preset === "renter";
  const openHouse = preset === "open_house";
  const buyer = preset === "buyer";
  const saved = recovery.state.status === "saved" ? recovery.state.receipt : null;
  const submitting = recovery.state.status === "submitting";
  const qa = review ? buyerHasQaMarkers(review) : false;
  const eventOptions = { sessionId: recovery.key };
  const requestLabel = openHouse ? "Register for Open House" : renter ? "Request Renter Review" : "Request Buyer Plan";

  useLayoutEffect(() => {
    committedReview.current = review ? buyerReviewFingerprint(review) : "";
    if (review) reviewRef.current?.focus();
  }, [review]);
  useLayoutEffect(() => { if (saved) savedRef.current?.focus(); }, [saved]);

  function invalidateReview() {
    if (recovery.locked || recovery.isBusy()) return;
    if (review) setReview(null);
    if (error) setError(null);
    recovery.clearEditableFailure();
  }

  function recordOutcome(outcome: PublicLeadOutcome | null) {
    if (!outcome) return;
    if (outcome.status === "saved") {
      if (!outcome.receipt.idempotentReplay && !outcome.receipt.duplicate_of_lead_id) {
        trackEvent("lead_created", attribution, { funnel_name: preset, lead_source_surface: surface }, eventOptions);
      }
      trackEvent("thank_you_viewed", attribution, { funnel_name: preset }, eventOptions);
    } else {
      trackEvent("lead_submit_failed", attribution, { funnel_name: preset, lead_source_surface: surface, step_name: "contact" }, eventOptions);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recovery.locked || recovery.isBusy()) return;
    setError(null);
    let actual: BuyerFormSnapshot;
    try { actual = readBuyerForm(new FormData(event.currentTarget), preset, kind); }
    catch (caught) {
      const problem = caught instanceof IntakeReviewError ? caught : new IntakeReviewError("", "Review your entries before continuing.");
      setError({ field: problem.field, message: problem.message });
      const field = event.currentTarget.elements.namedItem(problem.field);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    if (intakeMode !== "live" && intakeMode !== "synthetic_qa") {
      setError({ message: "Preview only. Entries here are not saved. Open the live form to send a request." }); return;
    }
    // Same local QA boundary as Home Value, not a new server classifier or permission.
    if (intakeMode === "synthetic_qa" &&
      (!actual.name.toUpperCase().includes("INTERNAL QA") || !actual.name.toUpperCase().includes("DO NOT CONTACT") ||
        !actual.email.toLowerCase().endsWith("@example.test"))) {
      setError({ message: "Synthetic QA only: use an INTERNAL QA / DO NOT CONTACT name and an example.test email. Do not enter personal contact details here." }); return;
    }
    if (!recovery.key) {
      setError({ message: "This browser could not create a secure submission reference. Refresh and try again." }); return;
    }
    if (buyerReviewFingerprint(actual) !== committedReview.current) {
      setReview(actual);
      if (review) setError({ message: "Your details changed. Review the updated request before sending." });
      return;
    }
    const payload = {
      funnel_type: preset, lead_type: preset, lead_source_surface: surface,
      name: actual.name, email: actual.email, phone: actual.phone,
      ...(buyer ? { buyer_interest: actual.buyerInterest } : {
        target_geography: actual.area, property_id: propertyId || undefined,
        financing: actual.financing || undefined, preapproval: actual.preapproval || undefined,
      }),
      timeline: actual.timeline || undefined, question: actual.question,
      consent: actual.consent, consent_email: actual.consent && Boolean(actual.email),
      consent_call: actual.consent && Boolean(actual.phone),
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: surface + ":buyer-intake", website: actual.website,
      widget_session_id: recovery.key, idempotency_key: recovery.key, attribution,
    };
    trackEvent("funnel_started", attribution, { funnel_name: preset, lead_source_surface: surface }, eventOptions);
    trackEvent("contact_submitted", attribution, { funnel_name: preset, lead_source_surface: surface }, eventOptions);
    if (actual.consent) trackEvent("consent_accepted", attribution, { funnel_name: preset, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION }, eventOptions);
    recordOutcome(await recovery.start(JSON.stringify(payload)));
  }

  const describedBy = error ? "buyer-contact-requirement buyer-form-status" : "buyer-contact-requirement";
  return (
    <LuxuryCard className={compact ? "p-4" : "p-5 sm:p-7"}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">{openHouse ? "Open-house registration" : renter ? "Renter path" : "Buyer path"}</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
        {openHouse ? "Register interest in " + (propertyLabel || "this open house") + "." : renter ? "See what a path from renting to owning could look like." : "Turn your next move into a clear local buying plan."}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">Share the basics. Mike or the approved team can review the request and follow up with practical next steps.</p>
      {!saved ? <form noValidate onSubmit={submit} onInput={invalidateReview} onChange={invalidateReview} className="mt-6" aria-describedby={error ? "buyer-form-status" : undefined}>
        <fieldset disabled={recovery.locked} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <legend className="sr-only">Your request</legend>
          <p id="buyer-contact-requirement" className="text-xs leading-5 text-[#b7aa94] sm:col-span-2">
            Email or phone is required for follow-up. {buyer ? "Your name and buying interest are required; planning details are optional." : "Name, area, and planning details are optional but help Mike prepare."}
          </p>
          {buyer ? <>
            <fieldset className="grid gap-3 rounded-md border border-white/15 p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-semibold text-[#f4ead4]">What are you interested in?</legend>
              {(["specific", "search"] as const).map(option => <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[#d9ceb8]">
                <input type="radio" name="buyer-interest-kind" value={option} checked={kind === option} onChange={() => { invalidateReview(); setKind(option); }} className="h-5 w-5 accent-[#cda24a]" />
                {option === "specific" ? "A specific property" : "A general home search"}
              </label>)}
            </fieldset>
            {/* Keep native values mounted across path changes; serialize only the selected path. */}
            <div hidden={kind !== "specific"} className="space-y-4 sm:col-span-2">
              <TextField name="buyer-address" label="Property address (or provide a listing URL)" autoComplete="off" maxLength={500} placeholder="Address of the property you are considering" />
              <TextField name="buyer-listing-url" label="Listing URL (or provide an address)" type="url" autoComplete="off" maxLength={2048} placeholder="https://…" />
              <p className="text-xs leading-5 text-[#b7aa94]">Listing links are references only. We do not fetch or verify the listing here.</p>
              <TextField name="buyer-unit" label="Unit or apartment (optional)" autoComplete="off" maxLength={100} />
              <TextField name="buyer-reference" label="Listing reference (optional)" autoComplete="off" maxLength={160} />
            </div>
            <div hidden={kind !== "search"} className="space-y-4 sm:col-span-2">
              <TextField name="buyer-desired-area" label="Desired area" autoComplete="off" maxLength={500} placeholder="Wilson or Eastern NC" required={kind === "search"} />
              <TextField name="buyer-budget" label="Budget range (optional)" autoComplete="off" maxLength={160} placeholder="Your approximate range, if known" />
            </div>
          </> : <TextField name="buyer-area" label={openHouse ? "Property or event location" : "Target area"} placeholder={propertyLabel || "Wilson or Eastern NC"} defaultValue={propertyLabel} maxLength={500} />}
          <TextField name="buyer-name" label="Name" autoComplete="name" placeholder="Your name" maxLength={160} required={buyer} aria-invalid={error?.field === "buyer-name" || undefined} />
          <TextField name="buyer-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} aria-invalid={error?.field === "buyer-email" || undefined} aria-describedby={describedBy} />
          <TextField name="buyer-phone" label="Phone" type="tel" autoComplete="tel" placeholder="Phone with area code" maxLength={40} aria-invalid={error?.field === "buyer-phone" || error?.message === "Add an email or phone number so Mike can follow up." || undefined} aria-describedby={describedBy} />
          <SelectField name="buyer-timeline" label="Timeline (optional)" defaultValue="">
            <option value="">Select a timeline</option><option>ASAP</option><option>30-60 days</option><option>3-6 months</option><option>Just planning</option>
          </SelectField>
          {!buyer ? <>
            <SelectField name="buyer-financing" label="Financing context (optional)" defaultValue="">
              <option value="">Select financing context</option><option>Preapproved</option><option>Working with a lender</option><option>Cash</option><option>Not sure yet</option>
            </SelectField>
            <label className="flex items-center gap-3 text-sm text-[#d9ceb8]"><input name="buyer-preapproval" value="yes" type="checkbox" className="h-4 w-4 accent-[#cda24a]" />I have a preapproval or lender conversation underway.</label>
          </> : null}
          <TextAreaField name="buyer-question" label="What would be most helpful?" placeholder="Tell Mike what you are trying to decide." rows={4} maxLength={2000} className="sm:col-span-2" />
          <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <LeadConsentField />
          {review ? <section aria-label="Review your request" className="space-y-2 rounded-md border border-[#cda24a55] bg-black/30 p-4 text-sm leading-6 sm:col-span-2">
            <h3 ref={reviewRef} tabIndex={-1} className="font-semibold text-[#f4ead4]">Review your request</h3>
            {review.buyerInterest?.kind === "specific" ? review.buyerInterest.properties.map((property, index) => <div key={index} className="select-text break-words">
              <p>Property address: {property.address_text || "Not provided"}</p><p>Listing URL: {property.listing_url || "Not provided"}</p>
              {property.unit ? <p>Unit: {property.unit}</p> : null}{property.reference ? <p>Reference: {property.reference}</p> : null}
            </div>) : review.buyerInterest?.kind === "search" ? <div className="select-text break-words"><p>Desired area: {review.buyerInterest.desired_area}</p><p>Budget: {review.buyerInterest.budget_range || "Not provided"}</p></div> : <p>Area / property: {review.area || "Not provided"}</p>}
            <p className="select-text break-words">Name: {review.name || "Not provided"}</p>
            <p className="select-text break-words">Email: {review.email || "Not provided"}</p><p className="select-text break-words">Phone: {review.phone || "Not provided"}</p>
            <p>Timeline: {review.timeline || "Not provided"}</p><p className="select-text break-words">Question: {review.question || "Not provided"}</p>
            {!buyer ? <p>Financing: {review.financing || "Not provided"} · Preapproval context: {review.preapproval ? "Provided" : "Not provided"}</p> : null}
            <p>Optional contact permission: {review.consent ? "Selected by you" : "Not selected"}. Your existing consent choice is unchanged.</p>
            <button type="button" onClick={invalidateReview} className="amm-secondary-button min-h-11 px-4 py-3">Edit request</button>
          </section> : null}
          <button disabled={intakeMode === "checking"} className="amm-cyan-button min-h-11 px-5 py-4 disabled:opacity-60 sm:col-span-2">
            {submitting ? "Submitting" : review ? requestLabel : "Review request"}
          </button>
        </fieldset>
      </form> : <section className="mt-6 space-y-3" aria-live="polite">
        <h3 ref={savedRef} tabIndex={-1} className="font-serif text-2xl text-[#f4ead4]">Your request is in.</h3>
        <p className="text-sm leading-6 text-[#d9ceb8]">{qa ? "Your labeled troubleshooting request is stored for internal review. This confirmation does not create consumer contact or an appointment." : saved.message}</p>
        <p className="break-words text-sm text-[#d9ceb8]">Saved request reference: <span className="select-text font-mono">{saved.correlation_id}</span></p>
        {!qa ? <AppointmentRequestCTA leadId={saved.lead_id} sessionId={saved.session_id} requestSurface={surface} funnelName={preset} attribution={attribution} compact /> : <p className="text-sm text-[#d9ceb8]">Marked INTERNAL QA — DO NOT CONTACT. No appointment or consumer outreach is created.</p>}
      </section>}
      {error || recovery.state.status === "unconfirmed" || recovery.state.status === "not_saved" ? <div id="buyer-form-status" role="alert" className="mt-4 space-y-3 rounded-md border border-[#6e162680] bg-[#6e16261f] p-4 text-sm leading-6 text-[#ffcabd]">
        <p>{error?.message || (recovery.restored ? "An earlier request in this tab has not been confirmed. Its reference is retained, but your private form details were not stored. Ask Our Town Properties to check it before starting another." : recovery.state.status === "unconfirmed" || recovery.state.status === "not_saved" ? recovery.state.message : "")}</p>
        {recovery.locked && !submitting ? <p>Keep this page open and retain the request reference. Do not start a new request while this one is unresolved.</p> : null}
        {!recovery.persistent ? <p>This browser could not retain the reference across a reload. Keep this page open and save the reference for Our Town Properties to check.</p> : null}
        {recovery.key && recovery.locked ? <p className="break-words">Request reference: <span className="select-text font-mono">{recovery.key}</span></p> : null}
        {recovery.retrySeconds > 0 ? <p role="status">Wait {recovery.retrySeconds} seconds before retrying this same request.</p> : null}
        {recovery.canRetry ? <button type="button" disabled={recovery.retrySeconds > 0 || (intakeMode !== "live" && intakeMode !== "synthetic_qa")} onClick={async () => recordOutcome(await recovery.retry())} className="amm-secondary-button min-h-11 px-4 py-3 disabled:opacity-60">Retry identical request</button> : null}
      </div> : null}
      <p className="mt-4 text-xs leading-5 text-[#8f8778]">Availability, financing, and property details require direct confirmation. Not a survey.</p>
    </LuxuryCard>
  );
}
