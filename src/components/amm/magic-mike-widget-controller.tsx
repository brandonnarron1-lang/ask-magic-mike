"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MagicMikeWidgetShell } from "./magic-mike-widget-shell";
import { submitWidgetLead } from "@/lib/widget/submit-lead";
import type { LeadType, TimelineBucket } from "@/lib/leads/lead-types";

/**
 * MagicMikeWidgetController — deterministic state machine that drives the
 * `MagicMikeWidgetShell` visual surface.
 *
 * Steps (sequential, deterministic, no AI required):
 *   1. greeting       — Mike's opening line + intent chips
 *   2. qualifying     — up to 3 highest-value questions per lead type
 *   3. contact        — name + phone/email + consent
 *   4. submitting     — POST /api/leads
 *   5. success | error
 *
 * Event-tracking events fired (best-effort, fire-and-forget):
 *   widget_opened, widget_started, widget_intent_selected,
 *   widget_question_answered, widget_contact_submitted,
 *   widget_lead_created, widget_submit_failed, widget_cta_clicked.
 */

type IntentKey =
  | "buy"
  | "sell"
  | "cash_offer"
  | "home_value"
  | "listing_inquiry"
  | "relocate"
  | "invest"
  | "general_question";

const INTENT_OPTIONS: Array<{ key: IntentKey; label: string; leadType: LeadType }> = [
  { key: "buy",              label: "Buy a home",                leadType: "buyer" },
  { key: "sell",             label: "Sell my home",              leadType: "seller" },
  { key: "cash_offer",       label: "Request a direct-purchase review", leadType: "seller_cash_offer" },
  { key: "home_value",       label: "Find out my home value",    leadType: "home_value" },
  { key: "listing_inquiry",  label: "Ask about a listing",       leadType: "listing_inquiry" },
  { key: "relocate",         label: "I'm relocating",            leadType: "relocation" },
  { key: "invest",           label: "I'm an investor",           leadType: "investor" },
  { key: "general_question", label: "Just have a question",      leadType: "general_question" },
];

interface QuestionStep {
  key: "timeline" | "address" | "city" | "budget" | "condition" | "listing";
  label: string;
  type: "select" | "text";
  options?: Array<{ value: string; label: string }>;
}

function questionsForIntent(intent: IntentKey): QuestionStep[] {
  const timeline: QuestionStep = {
    key: "timeline",
    label: "What's your timeline?",
    type: "select",
    options: [
      { value: "asap",          label: "ASAP" },
      { value: "0_30_days",     label: "Within 30 days" },
      { value: "31_90_days",    label: "1–3 months" },
      { value: "3_6_months",    label: "3–6 months" },
      { value: "6_plus_months", label: "6+ months" },
      { value: "unknown",       label: "Not sure yet" },
    ],
  };
  const address: QuestionStep = {
    key: "address",
    label: "What's the property address?",
    type: "text",
  };
  const city: QuestionStep = {
    key: "city",
    label: "Which city / area?",
    type: "text",
  };
  const budget: QuestionStep = {
    key: "budget",
    label: "Rough budget?",
    type: "text",
  };
  const condition: QuestionStep = {
    key: "condition",
    label: "How would you describe the condition?",
    type: "select",
    options: [
      { value: "excellent",     label: "Excellent" },
      { value: "good",          label: "Good" },
      { value: "fair",          label: "Fair" },
      { value: "needs_repairs", label: "Needs repairs" },
      { value: "distressed",    label: "Distressed" },
    ],
  };
  const listing: QuestionStep = {
    key: "listing",
    label: "Which listing / address are you asking about?",
    type: "text",
  };

  switch (intent) {
    case "buy":
    case "relocate":
      return [city, budget, timeline];
    case "sell":
    case "home_value":
      return [address, timeline];
    case "cash_offer":
    case "invest":
      return [address, condition, timeline];
    case "listing_inquiry":
      return [listing, timeline];
    case "general_question":
    default:
      return [timeline];
  }
}

interface WidgetState {
  step:
    | "greeting"
    | "qualifying"
    | "contact"
    | "submitting"
    | "success"
    | "error";
  intent?: IntentKey;
  leadType?: LeadType;
  answers: Record<string, string>;
  questionIdx: number;
  questions: QuestionStep[];
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  consent: { sms: boolean; email: boolean };
  error?: string;
  leadId?: string;
}

const CONSENT_TEXT =
  "By submitting, I agree to be contacted by Our Town Properties / Ask Magic Mike about my real estate inquiry. Message/data rates may apply. Reply STOP to opt out.";

interface ControllerProps {
  listingId?: string | null;
  onClose?: () => void;
  /** Fire a lightweight tracking event. Defaults to the analytics endpoint. */
  onTrack?: (event: string, properties?: Record<string, unknown>) => void;
}

export function MagicMikeWidgetController({
  listingId,
  onClose,
  onTrack,
}: ControllerProps) {
  const [state, setState] = useState<WidgetState>({
    step: "greeting",
    answers: {},
    questionIdx: 0,
    questions: [],
    contact: { firstName: "", lastName: "", email: "", phone: "" },
    consent: { sms: true, email: true },
  });
  const formStartedAtMs = useRef<number>(Date.now());

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (onTrack) return onTrack(event, properties);
      if (typeof window === "undefined") return;
      // Best-effort fire-and-forget. Never blocks the UI.
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: event,
          properties: properties ?? {},
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [onTrack]
  );

  // Fire widget_opened once on mount.
  useEffect(() => {
    track("widget_opened", {
      page_url: typeof window !== "undefined" ? window.location.href : null,
      listing_id: listingId ?? null,
    });
  }, [track, listingId]);

  const pickIntent = useCallback(
    (intent: IntentKey, leadType: LeadType) => {
      const questions = questionsForIntent(intent);
      setState((s) => ({
        ...s,
        step: questions.length > 0 ? "qualifying" : "contact",
        intent,
        leadType,
        questions,
        questionIdx: 0,
      }));
      track("widget_started");
      track("widget_intent_selected", { intent, leadType });
    },
    [track]
  );

  const answerCurrent = useCallback(
    (value: string) => {
      setState((s) => {
        const q = s.questions[s.questionIdx];
        if (!q) return s;
        const answers = { ...s.answers, [q.key]: value };
        const nextIdx = s.questionIdx + 1;
        const done = nextIdx >= s.questions.length;
        track("widget_question_answered", {
          questionKey: q.key,
          intent: s.intent,
        });
        return {
          ...s,
          answers,
          questionIdx: done ? s.questionIdx : nextIdx,
          step: done ? "contact" : "qualifying",
        };
      });
    },
    [track]
  );

  const submit = useCallback(async () => {
    if (!state.intent || !state.leadType) return;
    if (!state.contact.email && !state.contact.phone) {
      setState((s) => ({
        ...s,
        step: "error",
        error: "Please share an email or phone so Mike's team can follow up.",
      }));
      return;
    }
    track("widget_contact_submitted", {
      hasEmail: !!state.contact.email,
      hasPhone: !!state.contact.phone,
    });
    setState((s) => ({ ...s, step: "submitting", error: undefined }));

    const result = await submitWidgetLead({
      leadType: state.leadType,
      intent: state.intent,
      firstName: state.contact.firstName,
      lastName: state.contact.lastName,
      email: state.contact.email,
      phone: state.contact.phone,
      propertyAddress: state.answers.address ?? null,
      city: state.answers.city ?? null,
      timeline: (state.answers.timeline as TimelineBucket | undefined) ?? "unknown",
      listingId: listingId ?? undefined,
      notes: buildNotes(state.answers),
      consent: {
        ...state.consent,
        language: CONSENT_TEXT,
      },
      formStartedAtMs: formStartedAtMs.current,
    });

    if (!result.ok) {
      track("widget_submit_failed", { error: result.error });
      setState((s) => ({
        ...s,
        step: "error",
        error:
          result.error ??
          "We couldn't send that just now. Please try again, or call Mike directly.",
      }));
      return;
    }

    track("widget_lead_created", { leadId: result.leadId });
    setState((s) => ({ ...s, step: "success", leadId: result.leadId }));
  }, [state, listingId, track]);

  // Renderable derived state for the shell.
  const greetingMessages = useMemo(
    () => [
      {
        from: "mike" as const,
        text:
          "Hi, I'm Mike Eatmon at Our Town Properties. What can I help with today?",
      },
    ],
    []
  );

  // --- Render branches ---
  if (state.step === "greeting") {
    return (
      <MagicMikeWidgetShell
        variant="answer"
        messages={greetingMessages}
        prompts={[]}
        hideInput
        onClose={onClose}
        answer={<IntentPicker onPick={pickIntent} />}
      />
    );
  }

  if (state.step === "qualifying") {
    const q = state.questions[state.questionIdx];
    return (
      <MagicMikeWidgetShell
        variant="answer"
        messages={[
          { from: "mike", text: q.label },
          ...transcriptSoFar(state),
        ]}
        prompts={[]}
        answer={
          <QuestionAnswerer
            key={q.key}
            question={q}
            onAnswer={answerCurrent}
          />
        }
        hideInput
        onClose={onClose}
      />
    );
  }

  if (state.step === "contact") {
    return (
      <MagicMikeWidgetShell
        variant="lead"
        messages={[
          {
            from: "mike",
            text:
              "Got it. How should we follow up? Phone or email works — we'll respect your choice.",
          },
          ...transcriptSoFar(state),
        ]}
        prompts={[]}
        lead={
          <ContactForm
            value={state.contact}
            consent={state.consent}
            onChange={(c, consent) =>
              setState((s) => ({
                ...s,
                contact: { ...s.contact, ...c },
                consent: { ...s.consent, ...consent },
              }))
            }
            onSubmit={submit}
            consentText={CONSENT_TEXT}
          />
        }
        hideInput
        onClose={onClose}
      />
    );
  }

  if (state.step === "submitting") {
    return (
      <MagicMikeWidgetShell
        variant="thinking"
        messages={[
          { from: "mike", text: "Sending your details to Mike's team…" },
        ]}
        prompts={[]}
        hideInput
        onClose={onClose}
      />
    );
  }

  if (state.step === "error") {
    return (
      <MagicMikeWidgetShell
        variant="answer"
        messages={[
          {
            from: "mike",
            text:
              state.error ??
              "Something went wrong on our side. Please try again or call Mike directly.",
          },
        ]}
        prompts={["Try again", "Call Mike"]}
        hideInput
        onClose={onClose}
        answer={
          <div data-testid="widget-error">
            <ErrorActions
              onRetry={() =>
                setState((s) => ({ ...s, step: "contact", error: undefined }))
              }
              onCall={() => {
                track("widget_cta_clicked", { cta: "call_mike_after_error" });
              }}
            />
          </div>
        }
      />
    );
  }

  // success
  return (
    <MagicMikeWidgetShell
      variant="answer"
      messages={[
        {
          from: "mike",
          text:
            "Thanks — Mike Eatmon or the Our Town Properties team will follow up with local guidance. Preliminary home value range only; not an appraisal.",
        },
      ]}
      prompts={["Call Mike", "Ask another question"]}
      hideInput
      onClose={onClose}
      answer={
        <div data-testid="widget-success">
          <SuccessActions
            leadId={state.leadId}
            onCall={() => track("widget_cta_clicked", { cta: "call_mike" })}
            onRestart={() =>
              setState({
                step: "greeting",
                answers: {},
                questionIdx: 0,
                questions: [],
                contact: { firstName: "", lastName: "", email: "", phone: "" },
                consent: { sms: true, email: true },
              })
            }
          />
        </div>
      }
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function transcriptSoFar(state: WidgetState): Array<{ from: "mike" | "user"; text: string }> {
  return Object.entries(state.answers).map(([k, v]) => ({
    from: "user" as const,
    text: `${labelFor(k)}: ${v}`,
  }));
}
function labelFor(k: string): string {
  const map: Record<string, string> = {
    timeline:  "Timeline",
    address:   "Address",
    city:      "Area",
    budget:    "Budget",
    condition: "Condition",
    listing:   "Listing",
  };
  return map[k] ?? k;
}
function buildNotes(answers: Record<string, string>): string {
  return Object.entries(answers)
    .map(([k, v]) => `${labelFor(k)}: ${v}`)
    .join("\n");
}

function IntentPicker({
  onPick,
}: {
  onPick: (intent: IntentKey, leadType: LeadType) => void;
}) {
  return (
    <div
      data-testid="widget-intent-picker"
      className="mt-3 grid grid-cols-1 gap-2"
    >
      {INTENT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          data-testid={`widget-intent-option-${opt.key}`}
          onClick={() => onPick(opt.key, opt.leadType)}
          className="rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-left hover:border-gold-400/55 hover:bg-gold-400/[0.06]"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function QuestionAnswerer({
  question,
  onAnswer,
}: {
  question: QuestionStep;
  onAnswer: (v: string) => void;
}) {
  const [text, setText] = useState("");
  if (question.type === "select" && question.options) {
    return (
      <div className="grid grid-cols-1 gap-2" data-testid="widget-question-select">
        {question.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onAnswer(o.value)}
            className="rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-left hover:border-gold-400/55 hover:bg-gold-400/[0.06]"
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <form
      data-testid="widget-question-text"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAnswer(text.trim());
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        data-testid="widget-question-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 rounded-md border border-white/12 bg-white/[0.06] px-3 py-2 text-[14px] text-cream"
        autoFocus
      />
      <button
        type="submit"
        data-testid="widget-answer-submit"
        className="rounded-md bg-gold-400 px-3 py-2 text-[13px] font-bold text-midnight"
      >
        Next
      </button>
    </form>
  );
}

function ContactForm({
  value,
  consent,
  consentText,
  onChange,
  onSubmit,
}: {
  value: { firstName: string; lastName: string; email: string; phone: string };
  consent: { sms: boolean; email: boolean };
  consentText: string;
  onChange: (
    c: Partial<{ firstName: string; lastName: string; email: string; phone: string }>,
    consent: Partial<{ sms: boolean; email: boolean }>
  ) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      data-testid="widget-contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-2 text-[13px]"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          data-testid="widget-contact-name"
          placeholder="First name"
          value={value.firstName}
          onChange={(e) => onChange({ firstName: e.target.value }, {})}
          className="rounded-md border border-white/12 bg-white/[0.06] px-3 py-2"
        />
        <input
          data-testid="widget-contact-last-name"
          placeholder="Last name"
          value={value.lastName}
          onChange={(e) => onChange({ lastName: e.target.value }, {})}
          className="rounded-md border border-white/12 bg-white/[0.06] px-3 py-2"
        />
      </div>
      <input
        type="email"
        data-testid="widget-contact-email"
        placeholder="Email"
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value }, {})}
        className="w-full rounded-md border border-white/12 bg-white/[0.06] px-3 py-2"
      />
      <input
        type="tel"
        data-testid="widget-contact-phone"
        placeholder="Phone (optional, recommended)"
        value={value.phone}
        onChange={(e) => onChange({ phone: e.target.value }, {})}
        className="w-full rounded-md border border-white/12 bg-white/[0.06] px-3 py-2"
      />
      <label className="flex items-start gap-2 text-[11.5px] text-slate-300">
        <input
          type="checkbox"
          data-testid="widget-consent-sms"
          checked={consent.sms}
          onChange={(e) => onChange({}, { sms: e.target.checked })}
          className="mt-0.5"
        />
        <span>OK to text me about my request</span>
      </label>
      <label className="flex items-start gap-2 text-[11.5px] text-slate-300">
        <input
          type="checkbox"
          data-testid="widget-consent-email"
          checked={consent.email}
          onChange={(e) => onChange({}, { email: e.target.checked })}
          className="mt-0.5"
        />
        <span>OK to email me about my request</span>
      </label>
      <p className="text-[10.5px] text-slate-400 leading-relaxed">{consentText}</p>
      <button
        type="submit"
        data-testid="widget-submit"
        className="w-full rounded-md bg-gold-400 px-3 py-2.5 font-bold text-midnight"
      >
        Send to Mike
      </button>
    </form>
  );
}

function ErrorActions({
  onRetry,
  onCall,
}: {
  onRetry: () => void;
  onCall: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px]"
      >
        Try again
      </button>
      <a
        href={`tel:${process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337"}`}
        onClick={onCall}
        className="rounded-md bg-gold-400 px-3 py-2 text-[13px] font-bold text-midnight text-center"
      >
        Call Mike
      </a>
    </div>
  );
}

function SuccessActions({
  leadId,
  onCall,
  onRestart,
}: {
  leadId?: string;
  onCall: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mt-2">
      {leadId ? (
        <p className="text-[11px] text-slate-400 mb-2">Reference: {leadId.slice(0, 8)}…</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${process.env.NEXT_PUBLIC_AGENT_PHONE ?? "+12522454337"}`}
          onClick={onCall}
          className="rounded-md bg-gold-400 px-3 py-2 text-[13px] font-bold text-midnight text-center"
        >
          Call Mike
        </a>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px]"
        >
          Ask another question
        </button>
      </div>
    </div>
  );
}
