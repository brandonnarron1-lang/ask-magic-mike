"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { conditionOptions, sellerPaths, timelineOptions } from "../../lib/constants";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { publicLeadErrorMessage } from "../../lib/publicLeadErrors";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { TextAreaField, TextField } from "./FormField";
import { LuxuryCard } from "./LuxuryCard";

type SellerIntentSectionProps = {
  surface?: LeadSourceSurface;
  compact?: boolean;
};

export function SellerIntentSection({ surface = "seller_page", compact = false }: SellerIntentSectionProps) {
  const [attribution] = useState<Attribution>(() =>
    typeof window === "undefined" ? initialAttribution : readAttribution(),
  );
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [sellerSuccess, setSellerSuccess] = useState(false);
  const [leadReference, setLeadReference] = useState<{ leadId: string | null; sessionId: string | null }>({
    leadId: null,
    sessionId: null,
  });
  const [submitting, setSubmitting] = useState(false);

  async function submitSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSellerMessage(null);
    setSellerSuccess(false);

    const formData = new FormData(event.currentTarget);
    const payload = {
      funnel_type: "seller",
      lead_source_surface: surface,
      address: clean(formData.get("seller-address")),
      name: clean(formData.get("seller-name")) || undefined,
      email: clean(formData.get("seller-email")) || undefined,
      phone: clean(formData.get("seller-phone")),
      condition: clean(formData.get("condition")),
      timeline: clean(formData.get("seller-timeline")),
      notes: clean(formData.get("notes")) || undefined,
      status: "new",
      assigned_agent_id: null,
      attribution,
    };

    if (payload.address.length < 5 || payload.phone.replace(/\D/g, "").length < 10) {
      setSellerMessage("Property address and phone are required.");
      return;
    }

    setSubmitting(true);
    trackEvent("seller_form_submit", attribution, {
      funnel_name: "seller",
      step_name: "seller_intent",
      lead_source_surface: surface,
    });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        lead_id?: string | null;
        session_id?: string | null;
      };
      if (!res.ok) throw new Error(publicLeadErrorMessage(data.error));
      trackEvent("lead_created", attribution, { funnel_name: "seller", step_name: "seller_intent" });
      setSellerMessage(data.message || "Got it. Mike will review it.");
      setLeadReference({ leadId: data.lead_id || null, sessionId: data.session_id || null });
      setSellerSuccess(true);
      event.currentTarget.reset();
    } catch (error) {
      setSellerMessage(publicLeadErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setSubmitting(false);
    }
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

      <form onSubmit={submitSeller} className="mt-6 grid gap-4 sm:grid-cols-2" aria-describedby={sellerMessage ? "seller-form-status" : undefined}>
        <TextField name="seller-address" required label="Property address" placeholder="Property address" className="sm:col-span-2" />
        <TextField name="seller-name" label="Name optional" placeholder="Name" />
        <TextField name="seller-phone" required type="tel" label="Phone required" placeholder="Phone" />
        <TextField name="seller-email" type="email" label="Email optional" placeholder="Email" />
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Condition</span>
          <select name="condition" className="amm-form-field text-base">
            {conditionOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Timeline</span>
          <select name="seller-timeline" className="amm-form-field text-base">
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <TextAreaField name="notes" label="Notes" placeholder="What should Mike know before calling?" rows={4} className="sm:col-span-2" />
        <button disabled={submitting} aria-busy={submitting} className="amm-primary-button px-5 py-4 disabled:opacity-60 sm:col-span-2">
          {submitting ? "Sending" : "Send Seller Details"}
        </button>
      </form>
      {sellerMessage ? (
        <div
          id="seller-form-status"
          className={`mt-4 rounded-md border p-4 text-sm leading-6 ${
            sellerSuccess
              ? "border-[#cda24a55] bg-[#cda24a14] text-[#f4ead4]"
              : "border-[#6e162680] bg-[#6e16261f] text-[#ffcabd]"
          }`}
          role="status"
          aria-live="polite"
        >
          <p>{sellerMessage}</p>
          {sellerSuccess ? (
            <div className="mt-4">
              <AppointmentRequestCTA
                leadId={leadReference.leadId}
                sessionId={leadReference.sessionId}
                requestSurface={surface}
                funnelName="seller"
                attribution={attribution}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </LuxuryCard>
  );
}
