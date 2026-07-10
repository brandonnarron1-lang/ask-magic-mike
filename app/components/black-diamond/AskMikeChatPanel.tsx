"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import { initialAttribution, readAttribution } from "../../lib/attribution";
import { starterPrompts } from "../../lib/constants";
import { type Attribution, type LeadSourceSurface } from "../../lib/leadPayload";
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

  function markStarted(stepName: string) {
    if (chatStarted) return;
    setChatStarted(true);
    trackEvent("chat_started", attribution, {
      funnel_name: "ask_mike_chat",
      step_name: stepName,
      lead_source_surface: surface,
    });
    if (surface === "widget") {
      window.parent?.postMessage({ type: "askmagicmike:chat_started" }, "*");
    }
  }

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    markStarted("message_sent");
    setSubmitting(true);
    setChatError(null);
    setLastMessage(trimmed);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    trackEvent("chat_message_sent", attribution, {
      funnel_name: "ask_mike_chat",
      lead_source_surface: surface,
    });

    try {
      const res = await fetch("/api/chat", {
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

  return (
    <LuxuryCard
      id="ask-mike"
      className={`bg-[radial-gradient(circle_at_top_right,rgba(34,198,210,.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] ${compact ? "p-4" : "p-5 sm:p-7"}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">Ask Mike</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
        A local-advisor interface for practical real estate decisions.
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
          Ask about valuation strategy, timing, buyer demand, preparation, and neighborhood context. Address-specific advice creates a follow-up path instead of inventing market facts.
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
            <span className="sr-only">Ask Mike message</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => markStarted("message_focus")}
              placeholder="Ask Mike a real estate question..."
              className="amm-form-field rounded-full bg-black/60"
            />
          </label>
          <button disabled={submitting} aria-busy={submitting} className="amm-cyan-button mt-3 w-full px-5 py-3 disabled:opacity-60">
            {submitting ? "Sending" : "Send Question"}
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-[#8f8778]">
          For pricing, listing strategy, or property-specific facts, Mike or the Our Town Properties team should verify details directly.
        </p>
      </div>
    </LuxuryCard>
  );
}
