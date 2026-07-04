"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_page?: string;
  initial_path?: string;
  current_path?: string;
  gclid?: string;
  fbclid?: string;
  created_at: string;
};

type HomeValueLead = {
  funnel_type: "home_value";
  address: string;
  email: string;
  phone: string;
  timeline: string;
  status: "new";
  attribution: Attribution;
};

type SellerLead = {
  funnel_type: "seller";
  address: string;
  name?: string;
  email?: string;
  phone: string;
  timeline: string;
  condition: string;
  notes?: string;
  status: "new";
  attribution: Attribution;
};

type EventName =
  | "page_view"
  | "hero_cta_click"
  | "address_submit"
  | "email_submit"
  | "phone_submit"
  | "seller_form_submit"
  | "appointment_click"
  | "chat_started"
  | "lead_created";

const initialAttribution: Attribution = {
  created_at: new Date().toISOString(),
};

const timelineOptions = [
  "ASAP",
  "30-60 days",
  "3-6 months",
  "Just planning",
];

const starterPrompts = [
  "What is my home worth?",
  "Should I sell now or wait?",
  "What are buyers looking for in Wilson?",
  "Can you help me compare neighborhoods?",
];

function clean(value: string) {
  return value.trim();
}

function getDeviceCategory() {
  if (typeof window === "undefined") return "unknown";
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
  return "desktop";
}

function readAttribution(): Attribution {
  if (typeof window === "undefined") return initialAttribution;

  const stored = window.sessionStorage.getItem("amm_attribution");
  const currentPath = window.location.pathname + window.location.search;
  if (stored) {
    try {
      return { ...JSON.parse(stored), current_path: currentPath };
    } catch {
      window.sessionStorage.removeItem("amm_attribution");
    }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined,
    gclid: params.get("gclid") || undefined,
    fbclid: params.get("fbclid") || undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.href,
    initial_path: currentPath,
    current_path: currentPath,
    created_at: new Date().toISOString(),
  };

  window.sessionStorage.setItem("amm_attribution", JSON.stringify(attribution));
  return attribution;
}

function trackEvent(
  event: EventName,
  attribution: Attribution,
  properties: Record<string, string | number | undefined> = {},
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    properties: {
      ...properties,
      ...attribution,
      current_path: window.location.pathname + window.location.search,
      device_category: getDeviceCategory(),
    },
  };

  window.dispatchEvent(new CustomEvent("askmagicmike:event", { detail: payload }));

  const maybeWindow = window as Window & {
    dataLayer?: unknown[];
    posthog?: { capture?: (name: string, props: Record<string, unknown>) => void };
  };

  maybeWindow.dataLayer?.push(payload);
  maybeWindow.posthog?.capture?.(event, payload.properties);
}

export default function Home() {
  const [attribution, setAttribution] = useState<Attribution>(initialAttribution);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState(timelineOptions[1]);
  const [formError, setFormError] = useState<string | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const progress = useMemo(() => Math.min(step, 4), [step]);

  useEffect(() => {
    const captured = readAttribution();
    setAttribution(captured);
    trackEvent("page_view", captured, { funnel_name: "homepage", step_name: "landing" });
  }, []);

  function startChat(stepName = "chat_shell") {
    if (chatStarted) return;
    setChatStarted(true);
    trackEvent("chat_started", attribution, { funnel_name: "ask_mike_chat", step_name: stepName });
  }

  function goToValue() {
    trackEvent("hero_cta_click", attribution, {
      funnel_name: "home_value",
      step_name: "hero",
    });
    document.getElementById("home-value")?.scrollIntoView({ behavior: "smooth" });
  }

  function submitAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (clean(address).length < 5) {
      setFormError("Enter the full property address so Mike can review the right home.");
      return;
    }
    trackEvent("address_submit", attribution, {
      funnel_name: "home_value",
      step_name: "address",
    });
    setStep(2);
  }

  function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!email.includes("@") || email.length < 6) {
      setFormError("Enter a valid email for your valuation follow-up.");
      return;
    }
    trackEvent("email_submit", attribution, {
      funnel_name: "home_value",
      step_name: "email",
    });
    setStep(3);
  }

  async function submitPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setLeadMessage(null);

    if (clean(phone).replace(/\D/g, "").length < 10) {
      setFormError("Enter a phone number with area code.");
      return;
    }

    const payload: HomeValueLead = {
      funnel_type: "home_value",
      address: clean(address),
      email: clean(email),
      phone: clean(phone),
      timeline,
      status: "new",
      attribution,
    };

    setSubmitting(true);
    trackEvent("phone_submit", attribution, {
      funnel_name: "home_value",
      step_name: "phone_timeline",
    });

    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: { message?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit right now.");
      trackEvent("lead_created", attribution, {
        funnel_name: "home_value",
        step_name: "thank_you",
      });
      setLeadMessage(data.message || "Got it. Mike will follow up shortly.");
      setStep(4);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to submit right now.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSeller(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSellerMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload: SellerLead = {
      funnel_type: "seller",
      address: clean(String(formData.get("seller-address") || "")),
      name: clean(String(formData.get("seller-name") || "")) || undefined,
      email: clean(String(formData.get("seller-email") || "")) || undefined,
      phone: clean(String(formData.get("seller-phone") || "")),
      condition: clean(String(formData.get("condition") || "")),
      timeline: clean(String(formData.get("seller-timeline") || "")),
      notes: clean(String(formData.get("notes") || "")) || undefined,
      status: "new",
      attribution,
    };

    if (payload.address.length < 5 || payload.phone.replace(/\D/g, "").length < 10) {
      setSellerMessage("Property address and phone are required.");
      return;
    }

    trackEvent("seller_form_submit", attribution, {
      funnel_name: "seller",
      step_name: "seller_intent",
    });

    const res = await fetch("/api/valuation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { message?: string; error?: string } = await res.json();
    setSellerMessage(res.ok ? data.message || "Got it. Mike will review it." : data.error || "Unable to submit right now.");
    if (res.ok) {
      trackEvent("lead_created", attribution, {
        funnel_name: "seller",
        step_name: "seller_intent",
      });
      event.currentTarget.reset();
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <section className="relative min-h-[100svh] overflow-hidden">
        <picture className="absolute inset-0">
          <source media="(max-width: 767px)" srcSet="/brand/black-diamond/hero-home-mobile.webp" />
          <source srcSet="/brand/black-diamond/hero-home-desktop.webp" />
          <img
            src="/brand/black-diamond/hero-home-desktop.jpg"
            alt=""
            className="h-full w-full object-cover object-[64%_center] md:object-center"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.18),rgba(5,5,5,.82)_78%,#050505),linear-gradient(90deg,rgba(5,5,5,.86),rgba(5,5,5,.48)_42%,rgba(5,5,5,.12)_72%)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Image
              src="/brand/black-diamond/our-town-logo.png"
              alt="Our Town Properties"
              width={138}
              height={58}
              priority
              className="h-auto w-28 sm:w-36"
            />
            <a
              href="#ask-mike"
              onClick={() => startChat("nav")}
              className="rounded-full border border-[#cda24a66] bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e2c06f] backdrop-blur"
            >
              Ask Mike
            </a>
          </header>

          <div className="flex flex-1 items-end pb-12 pt-20 md:items-center md:pb-0 md:pt-0">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e2c06f]">
                Our Town Properties | Wilson, NC
              </p>
              <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[0.95] text-[#f4ead4] sm:text-6xl lg:text-7xl">
                Real estate answers, local strategy, and smarter moves in Wilson, NC.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#d9ceb8] sm:text-lg">
                Ask Magic Mike helps homeowners and buyers get fast, practical guidance from Our Town Properties, backed by local market experience and real lead follow-up.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goToValue}
                  className="rounded-full border border-[#e2c06f] bg-[#cda24a] px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#080807] shadow-[0_24px_70px_rgba(0,0,0,.48)] transition hover:bg-[#e2c06f]"
                >
                  Get My Home Value
                </button>
                <a
                  href="#ask-mike"
                  onClick={() => startChat("hero_cta")}
                  className="rounded-full border border-[#cda24a66] bg-black/40 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-[#f4ead4] backdrop-blur transition hover:border-[#e2c06f]"
                >
                  Ask Mike
                </a>
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
                Local guidance from Our Town Properties. Licensed in North Carolina. Serving Wilson and surrounding communities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="home-value" className="border-t border-[#cda24a2e] bg-[#080808] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">
              Home-value intake
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">
              Start with the address. Mike will bring the local context.
            </h2>
            <p className="mt-5 max-w-xl text-[#d9ceb8]">
              No instant fake estimate. This creates a real valuation request with local follow-up from Our Town Properties.
            </p>
          </div>

          <div className="rounded-lg border border-[#cda24a3d] bg-[linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025))] p-5 shadow-[0_28px_90px_rgba(0,0,0,.55)] backdrop-blur sm:p-7">
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-[#d9ceb8]">
                <span>Step {progress} of 4</span>
                <span>{["Address", "Email", "Phone", "Thank you"][progress - 1]}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#cda24a]"
                  style={{ width: `${(progress / 4) * 100}%` }}
                />
              </div>
            </div>

            {step === 1 ? (
              <form onSubmit={submitAddress} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-[#f4ead4]">Property address</span>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    autoComplete="street-address"
                    className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none transition placeholder:text-[#d9ceb87a] focus:border-[#22c6d2]"
                    placeholder="123 Lake Wilson Road, Wilson, NC"
                    required
                  />
                </label>
                <button className="w-full rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black">
                  Continue
                </button>
              </form>
            ) : null}

            {step === 2 ? (
              <form onSubmit={submitEmail} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-[#f4ead4]">Email for your valuation follow-up</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none transition placeholder:text-[#d9ceb87a] focus:border-[#22c6d2]"
                    placeholder="you@example.com"
                    required
                  />
                </label>
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
              <form onSubmit={submitPhone} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-[#f4ead4]">Phone</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    type="tel"
                    autoComplete="tel"
                    className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none transition placeholder:text-[#d9ceb87a] focus:border-[#22c6d2]"
                    placeholder="252-555-0123"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#f4ead4]">Timeline</span>
                  <select
                    value={timeline}
                    onChange={(event) => setTimeline(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none transition focus:border-[#22c6d2]"
                  >
                    {timelineOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
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
              <div className="space-y-5">
                <h3 className="font-serif text-3xl text-[#f4ead4]">Your request is in.</h3>
                <p className="text-[#d9ceb8]">
                  {leadMessage || "Mike will review the property details and follow up with practical next steps."}
                </p>
                <a
                  href="https://calendly.com/askmagicmike"
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
          </div>
        </div>
      </section>

      <section className="bg-[#0b0b0d] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <form onSubmit={submitSeller} className="rounded-lg border border-[#cda24a33] bg-black/35 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Seller intent</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">Need a direct selling conversation?</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input name="seller-address" required placeholder="Property address" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2] sm:col-span-2" />
              <input name="seller-name" placeholder="Name" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2]" />
              <input name="seller-phone" required type="tel" placeholder="Phone" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2]" />
              <input name="seller-email" type="email" placeholder="Email" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2]" />
              <select name="condition" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2]">
                <option>Move-in ready</option>
                <option>Needs light updates</option>
                <option>Needs major repairs</option>
                <option>Inherited or vacant</option>
              </select>
              <select name="seller-timeline" className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2]">
                {timelineOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <textarea name="notes" placeholder="Motivation or notes" rows={4} className="rounded-md border border-[#cda24a3d] bg-black/45 px-4 py-3 text-[#f4ead4] outline-none focus:border-[#22c6d2] sm:col-span-2" />
            </div>
            <button className="mt-5 w-full rounded-full bg-[#cda24a] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black">
              Send Seller Details
            </button>
            {sellerMessage ? <p className="mt-4 text-sm text-[#d9ceb8]">{sellerMessage}</p> : null}
          </form>

          <div id="ask-mike" className="rounded-lg border border-[#cda24a33] bg-[radial-gradient(circle_at_top_right,rgba(34,198,210,.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Ask Mike</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">A clean local-advisor chat entry point.</h2>
            <div className="mt-6 rounded-lg border border-white/10 bg-black/45 p-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Image src="/brand/black-diamond/our-town-logo.png" alt="Our Town Properties" width={96} height={41} className="h-auto w-20" />
                <div>
                  <p className="font-semibold text-[#f4ead4]">Mike Eatmon</p>
                  <p className="text-xs text-[#22c6d2]">Local guidance active</p>
                </div>
              </div>
              <div className="py-5 text-sm leading-6 text-[#d9ceb8]">
                Use Ask Mike for valuation strategy, timing, buyer demand, and neighborhood guidance. Messages create a follow-up path; no canned estimate is shown here.
              </div>
              <div className="grid gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => startChat("starter_prompt")}
                    className="rounded-md border border-[#cda24a33] bg-white/[.03] px-3 py-3 text-left text-sm text-[#f4ead4] transition hover:border-[#22c6d2]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="sr-only">Ask Mike message</span>
                <input
                  onFocus={() => startChat("message_focus")}
                  placeholder="Ask Mike a real estate question..."
                  className="w-full rounded-full border border-[#cda24a4a] bg-black/60 px-4 py-4 text-[#f4ead4] outline-none placeholder:text-[#d9ceb87a] focus:border-[#22c6d2]"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#050505] px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Social ad support</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">Approved 4:5 and 9:16 plates are ready for live ad copy.</h2>
            <p className="mt-4 text-[#d9ceb8]">These surfaces use the same approved Mike photography and keep headlines editable outside the image files.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Image src="/brand/black-diamond/hero-social-4x5.jpg" alt="Approved Ask Magic Mike 4:5 social ad visual plate" width={540} height={675} className="rounded-lg border border-[#cda24a33]" />
            <Image src="/brand/black-diamond/hero-social-story.jpg" alt="Approved Ask Magic Mike story ad visual plate" width={540} height={960} className="rounded-lg border border-[#cda24a33]" />
          </div>
        </div>
      </section>
    </main>
  );
}
