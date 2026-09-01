"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { tryCreateBrowserSubmissionId } from "../../lib/browserSubmissionId";
import { starterPrompts } from "../../lib/constants";
import { isValidLeadEmail, isValidLeadPhone } from "../../lib/leadContactValidation";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../lib/leadConsent";
import { clean, type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
import { publicLeadErrorMessage } from "../../lib/publicLeadErrors";
import { postToWidgetParent } from "../../lib/widgetMessaging";
import { AppointmentRequestCTA } from "./AppointmentRequestCTA";
import { TextField } from "./FormField";
import { LeadConsentField } from "./LeadConsentField";
import { LuxuryCard } from "./LuxuryCard";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AskMikeChatPanelProps = {
  surface?: LeadSourceSurface;
  compact?: boolean;
};

export function AskMikeChatPanel({ surface = "ask_page", compact = false }: AskMikeChatPanelProps) {
  const [attribution] = useState<Attribution>(() =>
    typeof window === "undefined" ? initialAttribution : readAttribution(),
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [answeredQuestion, setAnsweredQuestion] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [followUpName, setFollowUpName] = useState("");
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [followUpPhone, setFollowUpPhone] = useState("");
  const [followUpConsent, setFollowUpConsent] = useState(false);
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const leadCaptureInFlightRef = useRef(false);
  const followUpEmailRef = useRef<HTMLInputElement>(null);
  const followUpPhoneRef = useRef<HTMLInputElement>(null);
  const followUpConsentRef = useRef<HTMLInputElement>(null);
  const [leadReference, setLeadReference] = useState<{ leadId: string | null; sessionId: string | null }>({
    leadId: null,
    sessionId: null,
  });

  useEffect(() => {
    setChatSessionId(tryCreateBrowserSubmissionId());
  }, []);

  function markStarted(stepName: string) {
    if (chatStarted) return;
    setChatStarted(true);
    trackEvent("chat_started", attribution, {
      funnel_name: "ask_mike_chat",
      step_name: stepName,
      lead_source_surface: surface,
    }, { sessionId: chatSessionId });
    if (surface === "widget") {
      postToWidgetParent({ type: "askmagicmike:chat_started" }, attribution);
    }
  }

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (!chatSessionId) {
      setChatError("This browser could not create a secure submission reference. Refresh and try again.");
      return;
    }
    markStarted("message_sent");
    setSubmitting(true);
    setChatError(null);
    setLastMessage(trimmed);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    trackEvent("chat_message_sent", attribution, {
      funnel_name: "ask_mike_chat",
      lead_source_surface: surface,
    }, { sessionId: chatSessionId });

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, attribution, lead_source_surface: surface }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error("chat_failed");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.message ||
            "For address-specific advice, send the property address and best contact information so Mike can follow up.",
        },
      ]);
      setAnsweredQuestion(trimmed);
    } catch {
      setChatError("Mike's answer did not come through. You can retry, or send the property address through the home-value path for direct follow-up.");
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (leadReference.leadId || leadCaptureInFlightRef.current) return;

    const formData = new FormData(event.currentTarget);
    const email = clean(followUpEmail);
    const phone = clean(followUpPhone);
    setFollowUpError(null);
    setFollowUpMessage(null);

    if (!answeredQuestion) {
      setFollowUpError("Ask a question first so Mike can review the right context.");
      return;
    }
    if (!email && !phone) {
      setFollowUpError("Enter an email address or phone number for the requested follow-up.");
      followUpEmailRef.current?.focus();
      return;
    }
    if (email && !isValidLeadEmail(email)) {
      setFollowUpError("Enter a valid email address.");
      followUpEmailRef.current?.focus();
      return;
    }
    if (phone && !isValidLeadPhone(phone)) {
      setFollowUpError("Enter a phone number with area code.");
      followUpPhoneRef.current?.focus();
      return;
    }
    if (!followUpConsent) {
      setFollowUpError("Confirm contact permission before requesting local follow-up.");
      followUpConsentRef.current?.focus();
      return;
    }
    if (!chatSessionId) {
      setFollowUpError("This browser could not create a secure submission reference. Refresh and try again.");
      return;
    }

    leadCaptureInFlightRef.current = true;
    setFollowUpSubmitting(true);
    trackEvent("contact_submitted", attribution, {
      funnel_name: "ask_mike_chat",
      lead_source_surface: surface,
      step_name: "contact_follow_up",
    }, { sessionId: chatSessionId });
    trackEvent("consent_accepted", attribution, {
      funnel_name: "ask_mike_chat",
      lead_source_surface: surface,
      consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
    }, { sessionId: chatSessionId });

    try {
      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": chatSessionId,
        },
        body: JSON.stringify({
          funnel_type: "chat",
          lead_source_surface: surface,
          name: clean(followUpName) || undefined,
          email: email || undefined,
          phone: phone || undefined,
          question: answeredQuestion,
          status: "new",
          assigned_agent_id: null,
          widget_session_id: chatSessionId,
          idempotency_key: chatSessionId,
          consent: true,
          consent_email: Boolean(email),
          consent_call: Boolean(phone),
          consent_sms: false,
          consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION,
          consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT,
          consent_source: `${surface}:ask-follow-up`,
          website: clean(formData.get("website")),
          attribution,
        }),
      });
      const leadData = (await leadRes.json()) as {
        lead_id?: string | null;
        session_id?: string | null;
        message?: string;
        error?: string;
      };
      if (!leadRes.ok) throw new Error(publicLeadErrorMessage(leadData.error));
      if (!leadData.lead_id) throw new Error();

      const idempotentReplay = leadRes.headers.get("X-AMM-Idempotent-Replay") === "1";
      if (!idempotentReplay) {
        trackEvent("lead_created", attribution, {
          funnel_name: "ask_mike_chat",
          lead_source_surface: surface,
        }, { sessionId: chatSessionId });
        if (surface === "widget") {
          trackEvent("widget_lead_created", attribution, {
            funnel_name: "ask_mike_chat",
            lead_source_surface: surface,
          }, { sessionId: chatSessionId });
          postToWidgetParent({ type: "askmagicmike:lead_created" }, attribution);
        }
      }
      setLeadReference({
        leadId: leadData.lead_id,
        sessionId: leadData.session_id || chatSessionId,
      });
      setFollowUpMessage(
        leadData.message ||
          "Your follow-up request is stored. Mike or the approved team can now review your question and contact details.",
      );
      trackEvent("thank_you_viewed", attribution, {
        funnel_name: "ask_mike_chat",
        lead_source_surface: surface,
      }, { sessionId: chatSessionId });
    } catch (error) {
      trackEvent("lead_submit_failed", attribution, {
        funnel_name: "ask_mike_chat",
        lead_source_surface: surface,
        step_name: "contact_follow_up",
      }, { sessionId: chatSessionId });
      setFollowUpError(publicLeadErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setFollowUpSubmitting(false);
      leadCaptureInFlightRef.current = false;
    }
  }

  return (
    <LuxuryCard
      id="ask-mike"
      className={`bg-[radial-gradient(circle_at_top_right,rgba(34,198,210,.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] ${compact ? "p-4" : "p-5 sm:p-7"}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Ask Mike</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
        Start with the real estate question on your mind.
      </h2>
      <div className="mt-6 rounded-lg border border-white/10 bg-black/45 p-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Image src="/brand/black-diamond/our-town-logo.png" alt="Our Town Properties" width={96} height={41} className="h-auto w-20" />
          <div>
            <p className="font-semibold text-[#f4ead4]">Mike Eatmon</p>
            <p className="text-xs text-[#22c6d2]">Local guidance from Our Town Properties</p>
          </div>
        </div>
        <div className="py-5 text-sm leading-6 text-[#d9ceb8]">
          Ask about home-value strategy, timing, preparation, property features, and the objective criteria you choose. Property-specific guidance creates a follow-up path instead of inventing market facts.
        </div>
        <div className="grid gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              className="rounded-md border border-[#cda24a33] bg-white/[.03] px-3 py-3 text-left text-sm text-[#f4ead4] transition hover:border-[#22c6d2]"
            >
              {prompt}
            </button>
          ))}
        </div>
        {messages.length ? (
          <div className="mt-4 max-h-64 space-y-3 overflow-auto border-t border-white/10 pt-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-md px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 border border-[#cda24a33] bg-[#cda24a12] text-[#f4ead4]"
                    : "mr-8 border border-[#22c6d24a] bg-[#22c6d212] text-[#d9ceb8]"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        ) : null}
        {submitting ? (
          <div className="mt-4 mr-8 rounded-md border border-[#22c6d24a] bg-[#22c6d212] px-3 py-2 text-sm leading-6 text-[#d9ceb8]" role="status">
            Mike is drafting a careful answer...
          </div>
        ) : null}
        {chatError ? (
          <div className="mt-4 rounded-md border border-[#6e162680] bg-[#6e16261f] p-3 text-sm leading-6 text-[#ffcabd]" role="alert">
            <p>{chatError}</p>
            {lastMessage ? (
              <button
                type="button"
                onClick={() => void sendMessage(lastMessage)}
                className="amm-secondary-button mt-3 min-h-0 px-4 py-2 text-xs"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        <form onSubmit={submit} className="mt-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#f4ead4]">
              Your real estate question <span className="font-normal text-[#8f8778]">(required)</span>
            </span>
            <input
              type="text"
              name="question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => markStarted("message_focus")}
              placeholder="Ask Mike a real estate question..."
              required
              maxLength={2_000}
              autoComplete="off"
              enterKeyHint="send"
              aria-describedby="ask-mike-question-help"
              className="amm-form-field rounded-full bg-black/60"
            />
          </label>
          <button type="submit" disabled={submitting} aria-busy={submitting} className="amm-cyan-button mt-3 w-full px-5 py-3 disabled:opacity-60">
            {submitting ? "Sending" : "Send Question"}
          </button>
        </form>
        <p id="ask-mike-question-help" className="mt-4 text-xs leading-5 text-[#8f8778]">
          Sending a question by itself does not create a contact lead or trigger a lead alert. For pricing, listing strategy, or property-specific facts, Mike or the Our Town Properties team should verify details directly.
        </p>

        {answeredQuestion && !leadReference.leadId ? (
          <form
            noValidate
            onSubmit={submitFollowUp}
            className="mt-5 space-y-4 rounded-lg border border-[#cda24a33] bg-[#cda24a0d] p-4"
            aria-describedby={followUpError ? "ask-follow-up-requirement ask-follow-up-status" : "ask-follow-up-requirement"}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Optional local follow-up</p>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-[#f4ead4]">Want Mike's team to contact you?</h3>
              <p id="ask-follow-up-requirement" className="mt-2 text-sm leading-6 text-[#d9ceb8]">
                Enter at least one contact method and confirm permission. This separate request creates the contact lead and lead alert.
              </p>
            </div>
            <TextField
              label="Your name (optional)"
              name="follow-up-name"
              value={followUpName}
              onChange={(event) => setFollowUpName(event.target.value)}
              autoComplete="name"
              maxLength={160}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Email"
                inputRef={followUpEmailRef}
                name="follow-up-email"
                type="email"
                value={followUpEmail}
                onChange={(event) => {
                  setFollowUpEmail(event.target.value);
                  if (followUpError) setFollowUpError(null);
                }}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                aria-invalid={followUpError?.toLowerCase().includes("email") || undefined}
              />
              <TextField
                label="Phone"
                inputRef={followUpPhoneRef}
                name="follow-up-phone"
                type="tel"
                value={followUpPhone}
                onChange={(event) => {
                  setFollowUpPhone(event.target.value);
                  if (followUpError) setFollowUpError(null);
                }}
                autoComplete="tel"
                inputMode="tel"
                maxLength={40}
                aria-invalid={followUpError?.toLowerCase().includes("phone") || undefined}
              />
            </div>
            <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
              <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <LeadConsentField checked={followUpConsent} onChange={(checked) => {
              setFollowUpConsent(checked);
              if (followUpError) setFollowUpError(null);
            }} required inputRef={followUpConsentRef} />
            {followUpError ? (
              <div id="ask-follow-up-status" className="rounded-md border border-[#6e162680] bg-[#6e16261f] p-3 text-sm leading-6 text-[#ffcabd]" role="alert">
                {followUpError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={followUpSubmitting}
              aria-busy={followUpSubmitting}
              className="amm-primary-button w-full px-5 py-3 disabled:opacity-60"
            >
              {followUpSubmitting ? "Saving follow-up request" : "Request local follow-up"}
            </button>
          </form>
        ) : null}

        {leadReference.leadId ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-[#cda24a55] bg-[#cda24a14] p-4 text-sm leading-6 text-[#f4ead4]" role="status" aria-live="polite">
              {followUpMessage}
            </div>
            <AppointmentRequestCTA
              leadId={leadReference.leadId}
              sessionId={leadReference.sessionId}
              requestSurface={surface}
              funnelName="ask_mike_chat"
              attribution={attribution}
              compact
            />
          </div>
        ) : null}
      </div>
    </LuxuryCard>
  );
}
