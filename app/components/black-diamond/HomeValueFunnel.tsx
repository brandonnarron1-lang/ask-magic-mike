"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { brand, timelineOptions } from "../../lib/constants";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { LuxuryCard } from "./LuxuryCard";
import { ProgressBar } from "./ProgressBar";
import { SelectField, TextField } from "./FormField";

type HomeValueFunnelProps = {
  surface?: LeadSourceSurface;
  compact?: boolean;
  attributionOverrides?: Partial<Attribution>;
};

const stepLabels = ["Address", "Email", "Phone", "Thank you"];

export function HomeValueFunnel({
  surface = "home_value_page",
  compact = false,
  attributionOverrides = {},
}: HomeValueFunnelProps) {
  const [attribution] = useState<Attribution>(() =>
    typeof window === "undefined" ? initialAttribution : readAttribution(attributionOverrides),
  );
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState(timelineOptions[1]);
  const [formError, setFormError] = useState<string | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (clean(address).length < 5) {
      setFormError("Enter the full property address so Mike can review the right home.");
      return;
    }
    trackEvent("home_value_started", attribution, { funnel_name: "home_value", lead_source_surface: surface });
    trackEvent("address_submit", attribution, { funnel_name: "home_value", step_name: "address" });
    if (surface === "widget") {
      window.parent?.postMessage({ type: "askmagicmike:lead_started" }, "*");
    }
    setStep(2);
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!email.includes("@") || email.length < 6) {
      setFormError("Enter a valid email for your valuation follow-up.");
      return;
    }
    trackEvent("email_submit", attribution, { funnel_name: "home_value", step_name: "email" });
    setStep(3);
  }

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setLeadMessage(null);

    if (clean(phone).replace(/\D/g, "").length < 10) {
      setFormError("Enter a phone number with area code.");
      return;
    }

    setSubmitting(true);
    trackEvent("phone_submit", attribution, { funnel_name: "home_value", step_name: "phone_timeline" });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel_type: surface === "widget" ? "widget" : "home_value",
          lead_source_surface: surface,
          address: clean(address),
          email: clean(email),
          phone: clean(phone),
          timeline,
          status: "new",
          assigned_agent_id: null,
          attribution,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Unable to submit right now.");
      trackEvent("lead_created", attribution, { funnel_name: "home_value", step_name: "thank_you" });
      if (surface === "widget") {
        trackEvent("widget_lead_created", attribution, { funnel_name: "home_value" });
        window.parent?.postMessage({ type: "askmagicmike:lead_created" }, "*");
      }
      setLeadMessage(data.message || "Got it. Mike will follow up shortly.");
      setStep(4);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to submit right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LuxuryCard className={compact ? "p-4" : "p-5 sm:p-7"}>
      <ProgressBar step={step} labels={stepLabels} />

      {step === 1 ? (
        <form onSubmit={submitAddress} className="space-y-5" data-amm-step="address">
          <TextField
            label="Property address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            autoComplete="street-address"
            placeholder="123 Lake Wilson Road, Wilson, NC"
            required
          />
          <button className="w-full rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#e2c06f]">
            Continue
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={submitEmail} className="space-y-5" data-amm-step="email">
          <TextField
            label="Email for your valuation follow-up"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-full border border-[#cda24a66] px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
              Back
            </button>
            <button className="flex-1 rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black">
              Continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={submitPhone} className="space-y-5" data-amm-step="phone">
          <TextField
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="252-555-0123"
            required
          />
          <SelectField label="Timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)}>
            {timelineOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="rounded-full border border-[#cda24a66] px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
              Back
            </button>
            <button disabled={submitting} className="flex-1 rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-60">
              {submitting ? "Submitting" : "Request Valuation"}
            </button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <div className="space-y-5" data-amm-step="thank-you">
          <h3 className="font-serif text-3xl text-[#f4ead4]">Your request is in.</h3>
          <p className="text-[#d9ceb8]">
            {leadMessage || "Mike will review the property details and follow up with practical next steps."}
          </p>
          <a
            href={brand.calendlyUrl}
            onClick={() =>
              trackEvent("appointment_click", attribution, {
                funnel_name: "home_value",
                step_name: "thank_you",
              })
            }
            className="inline-flex rounded-full bg-[#cda24a] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-black"
          >
            Schedule a Conversation
          </a>
        </div>
      ) : null}

      {formError ? <p className="mt-4 text-sm text-[#ffcabd]">{formError}</p> : null}
    </LuxuryCard>
  );
}
