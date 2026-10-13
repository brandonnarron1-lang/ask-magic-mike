"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { usePublicIntakeRecovery } from "../../lib/client/publicIntakeRecovery";
import { conditionOptions, sellerPaths, timelineOptions } from "../../lib/constants";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { usePublicIntakeCapability } from "../../lib/publicIntakeCapability";
import type { PublicLeadOutcome } from "../../lib/publicLeadReceipt";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { TextAreaField, TextField } from "./FormField";
import { LeadConsentField } from "./LeadConsentField";
import { LuxuryCard } from "./LuxuryCard";

type SellerIntentSectionProps = {
  surface?: LeadSourceSurface;
  compact?: boolean;
};

export function SellerIntentSection({ surface = "seller_page", compact = false }: SellerIntentSectionProps) {
  const [attribution] = useState<Attribution>(() =>
    typeof window === "undefined" ? initialAttribution : readAttribution(),
  );
  const intakeMode = usePublicIntakeCapability();
  const recovery = usePublicIntakeRecovery();
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [suppressAppointment, setSuppressAppointment] = useState(false);
  const saved = recovery.state.status === "saved" ? recovery.state.receipt : null;
  const submitting = recovery.state.status === "submitting";
  const failure = recovery.state.status === "unconfirmed" || recovery.state.status === "not_saved" ? recovery.state : null;
  const message = sellerMessage || (saved ? saved.message : recovery.restored
    ? "An earlier request in this tab has not been confirmed. Its reference is retained, but your private form details were not stored. Ask Our Town Properties to check it before starting another."
    : failure?.message);
  const eventOptions = { sessionId: recovery.key };

  function recordOutcome(outcome: PublicLeadOutcome | null) {
    if (!outcome) return;
    if (outcome.status === "saved") {
      if (!outcome.receipt.idempotentReplay && !outcome.receipt.duplicate_of_lead_id) {
        trackEvent("lead_created", attribution, { funnel_name: "seller", step_name: "seller_intent" }, eventOptions);
      }
      trackEvent("thank_you_viewed", attribution, { funnel_name: "seller" }, eventOptions);
    } else {
      trackEvent("lead_submit_failed", attribution, {
        funnel_name: "seller", lead_source_surface: surface, step_name: "seller_intent",
      }, eventOptions);
    }
  }

  function clearEditableError() {
    if (recovery.locked || recovery.isBusy()) return;
    if (sellerMessage) setSellerMessage(null);
    recovery.clearEditableFailure();
  }

  async function submitSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recovery.locked || recovery.isBusy()) return;
    const form = event.currentTarget;
    setSellerMessage(null);

    const formData = new FormData(form);
    const email = clean(formData.get("seller-email"));
    const phone = clean(formData.get("seller-phone"));
    const consent = formData.get("consent") === "yes";
    const payload = {
      funnel_type: "seller",
      lead_source_surface: surface,
      address: clean(formData.get("seller-address")),
      name: clean(formData.get("seller-name")) || undefined,
      email: email || undefined,
      phone,
      condition: clean(formData.get("condition")) || undefined,
      timeline: clean(formData.get("seller-timeline")) || undefined,
      notes: clean(formData.get("notes")) || undefined,
      consent,
      consent_email: consent && Boolean(email),
      consent_call: consent && Boolean(phone),
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
      consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source: `${surface}:seller-intake`,
      website: clean(formData.get("website")),
      idempotency_key: recovery.key || undefined,
      status: "new",
      assigned_agent_id: null,
      widget_session_id: recovery.key || undefined,
      attribution,
    };

    if (payload.address.length < 5 || payload.phone.replace(/\D/g, "").length < 10) {
      setSellerMessage("Property address and phone are required.");
      return;
    }
    if (intakeMode !== "live" && intakeMode !== "synthetic_qa") {
      setSellerMessage("Preview only. Entries here are not saved. Open the live form to send a request.");
      return;
    }
    if (intakeMode === "synthetic_qa" &&
      (!clean(payload.name).toUpperCase().includes("INTERNAL QA") || !clean(payload.name).toUpperCase().includes("DO NOT CONTACT") ||
        !email.toLowerCase().endsWith("@example.test"))) {
      setSellerMessage("Synthetic QA only: use an INTERNAL QA / DO NOT CONTACT name and an example.test email. Do not enter personal contact details here.");
      return;
    }
    if (!recovery.key) {
      setSellerMessage("This browser could not create a secure submission reference. Refresh and try again.");
      return;
    }

    // CTA suppression only; canonical QA classification and consent are unchanged.
    const marker = [payload.name, payload.address, payload.notes].join(" ").toUpperCase();
    setSuppressAppointment(marker.includes("INTERNAL QA") || marker.includes("DO NOT CONTACT"));
    trackEvent("seller_form_submit", attribution, {
      funnel_name: "seller",
      step_name: "seller_intent",
      lead_source_surface: surface,
    }, eventOptions);
    trackEvent("funnel_started", attribution, { funnel_name: "seller", lead_source_surface: surface }, eventOptions);
    trackEvent("contact_submitted", attribution, { funnel_name: "seller", lead_source_surface: surface }, eventOptions);
    if (payload.consent) trackEvent("consent_accepted", attribution, { funnel_name: "seller", consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION }, eventOptions);

    recordOutcome(await recovery.start(JSON.stringify(payload)));
  }

  return (
    <LuxuryCard className={compact ? "p-4" : "p-5 sm:p-7"}>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Seller strategy</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
        Talk through the property before you spend money fixing the wrong things.
      </h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {sellerPaths.map((path) => (
          <span key={path} className="rounded-full border border-[#cda24a33] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9ceb8]">
            {path}
          </span>
        ))}
      </div>

      <form onSubmit={submitSeller} onInput={clearEditableError} onChange={clearEditableError} className="mt-6" aria-describedby={message ? "seller-form-status" : undefined}>
        <fieldset disabled={recovery.locked} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Seller request</legend>
        <TextField name="seller-address" required label="Property address" placeholder="Property address" className="sm:col-span-2" />
        <TextField name="seller-name" label="Name optional" placeholder="Name" />
        <TextField name="seller-phone" required type="tel" label="Phone required" placeholder="Phone" />
        <TextField name="seller-email" type="email" label="Email optional" placeholder="Email" />
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Condition (optional)</span>
          <select name="condition" defaultValue="" className="amm-form-field text-base">
            <option value="">Select condition</option>
            {conditionOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Timeline (optional)</span>
          <select name="seller-timeline" defaultValue="" className="amm-form-field text-base">
            <option value="">Select timeline</option>
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <TextAreaField name="notes" label="Notes" placeholder="What should Mike know before calling?" rows={4} className="sm:col-span-2" />
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <LeadConsentField />
        <button disabled={submitting || intakeMode === "checking"} aria-busy={submitting} className="amm-primary-button px-5 py-4 disabled:opacity-60 sm:col-span-2">
          {submitting ? "Sending" : "Send Seller Details"}
        </button>
        </fieldset>
      </form>
      <p className="mt-4 text-xs leading-5 text-[#8f8778]">Mike reviews the details before discussing next steps. No valuation or offer is promised by this form. Not a survey.</p>
      {message ? (
        <div
          id="seller-form-status"
          className={`mt-4 rounded-md border p-4 text-sm leading-6 ${
            saved
              ? "border-[#cda24a55] bg-[#cda24a14] text-[#f4ead4]"
              : "border-[#6e162680] bg-[#6e16261f] text-[#ffcabd]"
          }`}
          role="status"
          aria-live="polite"
        >
          <p>{message}</p>
          {saved ? <p className="mt-3 break-words">Saved request reference: <span className="select-text font-mono">{saved.correlation_id}</span></p> : null}
          {recovery.locked && !saved && !submitting ? <p className="mt-3">Keep this page open and retain the request reference. Do not start a new request while this one is unresolved.</p> : null}
          {!recovery.persistent && !saved ? <p className="mt-3">This browser could not retain the reference across a reload. Keep this page open and save the reference for Our Town Properties to check.</p> : null}
          {recovery.key && recovery.locked && !saved ? <p className="mt-3 break-words">Request reference: <span className="select-text font-mono">{recovery.key}</span></p> : null}
          {recovery.retrySeconds > 0 ? <p className="mt-3">Wait {recovery.retrySeconds} seconds before retrying this same request.</p> : null}
          {recovery.canRetry ? <button type="button" disabled={recovery.retrySeconds > 0 || (intakeMode !== "live" && intakeMode !== "synthetic_qa")} onClick={async () => recordOutcome(await recovery.retry())} className="amm-secondary-button mt-3 min-h-11 px-4 py-3 disabled:opacity-60">Retry identical request</button> : null}
          {saved && !suppressAppointment ? (
            <div className="mt-4">
              <AppointmentRequestCTA
                leadId={saved.lead_id}
                sessionId={saved.session_id}
                requestSurface={surface}
                funnelName="seller"
                attribution={attribution}
                compact
              />
            </div>
          ) : saved ? <p className="mt-3">Marked INTERNAL QA or DO NOT CONTACT. No appointment or consumer outreach is created.</p> : null}
        </div>
      ) : null}
    </LuxuryCard>
  );
}
