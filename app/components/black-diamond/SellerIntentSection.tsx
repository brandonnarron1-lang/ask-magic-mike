"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { conditionOptions, sellerPaths, timelineOptions } from "../../lib/constants";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { publicLeadErrorMessage } from "../../lib/publicLeadErrors";
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
  const [submitting, setSubmitting] = useState(false);

  async function submitSeller(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSellerMessage(null);

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
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(publicLeadErrorMessage(data.error));
      trackEvent("lead_created", attribution, { funnel_name: "seller", step_name: "seller_intent" });
      setSellerMessage(data.message || "Got it. Mike will review it.");
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

      <form onSubmit={submitSeller} className="mt-6 grid gap-4 sm:grid-cols-2">
        <TextField name="seller-address" required label="Property address" placeholder="Property address" className="sm:col-span-2" />
        <TextField name="seller-name" label="Name optional" placeholder="Name" />
        <TextField name="seller-phone" required type="tel" label="Phone required" placeholder="Phone" />
        <TextField name="seller-email" type="email" label="Email optional" placeholder="Email" />
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Condition</span>
          <select name="condition" className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none focus:border-[#22c6d2]">
            {conditionOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#f4ead4]">Timeline</span>
          <select name="seller-timeline" className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none focus:border-[#22c6d2]">
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <TextAreaField name="notes" label="Notes" placeholder="What should Mike know before calling?" rows={4} className="sm:col-span-2" />
        <button disabled={submitting} className="rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#e2c06f] disabled:opacity-60 sm:col-span-2">
          {submitting ? "Sending" : "Send Seller Details"}
        </button>
      </form>
      {sellerMessage ? <p className="mt-4 text-sm text-[#d9ceb8]">{sellerMessage}</p> : null}
    </LuxuryCard>
  );
}
