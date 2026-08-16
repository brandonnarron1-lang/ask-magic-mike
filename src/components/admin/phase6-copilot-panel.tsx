"use client";

import { useState } from "react";
import type { AiLeadIntelligenceResult } from "@/lib/ai/openai-responses";

type CopilotResponse = AiLeadIntelligenceResult & {
  ok: boolean;
  error?: string;
  context?: { deterministicControls?: { consent?: { email: boolean; sms: boolean; call: boolean }; aiCanSend?: boolean; aiCanAssign?: boolean; aiCanChangeScore?: boolean } };
  tools?: Array<{ id: string; kind: string; humanApprovalRequired: boolean }>;
};

export function Phase6CopilotPanel({
  leadId,
  isTest,
  suppressed,
}: {
  leadId: string;
  isTest: boolean;
  suppressed: boolean;
}) {
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = (await response.json()) as CopilotResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "copilot_unavailable");
      setResult(data);
    } catch {
      setError("The advisory could not be generated. No lead data or communication state changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(14,116,144,.12),rgba(11,11,11,.96)_45%)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Phase 7 lead intelligence</p>
          <h2 className="mt-2 text-xl font-semibold text-[#f4ead4]">Human-review copilot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bdb4a4]">
            Uses the existing encrypted OpenAI key when the release flag is enabled, with a deterministic fallback. It cannot assign, score, contact, schedule, or change this lead.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="min-h-11 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Reviewing…" : result ? "Refresh advisory" : "Generate advisory"}
        </button>
      </div>

      {isTest || suppressed ? (
        <p className="mt-4 rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">
          {isTest ? "TEST RECORD — DO NOT CONTACT." : "Communication is suppressed for this lead."}
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-4 text-sm text-[#ffd7d7]">{error}</p> : null}

      {result ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Recorded-fact summary</p>
            <p className="mt-3 text-sm leading-6 text-[#f4ead4]">{result.output.summary}</p>
            <ul className="mt-3 space-y-2 text-sm text-[#d9ceb8]">
              {result.output.keyFacts.map((fact) => <li key={fact}>• {fact}</li>)}
            </ul>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">Suggested human action</p>
            <p className="mt-3 text-sm leading-6 text-[#f4ead4]">{result.output.recommendedNextHumanAction}</p>
            <p className="mt-4 text-xs leading-5 text-[#8f8778]">Confidence: {Math.round(result.output.confidence * 100)}%. {result.output.explanation}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 p-4 lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Drafts — review before any use</p>
            <dl className="mt-3 grid gap-4 lg:grid-cols-2">
              <div><dt className="text-xs text-[#8f8778]">Email</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-[#d9ceb8]">{result.output.suggestedEmailDraft}</dd></div>
              <div><dt className="text-xs text-[#8f8778]">SMS</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-[#d9ceb8]">{result.output.suggestedSmsDraft}</dd></div>
            </dl>
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 p-4 lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">Deterministic controls</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#d9ceb8]">
              <span className="rounded-full border border-white/10 px-3 py-1.5">Email consent: {result.context?.deterministicControls?.consent?.email ? "recorded" : "not recorded"}</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">SMS consent: {result.context?.deterministicControls?.consent?.sms ? "recorded" : "not recorded"}</span>
              <span className="rounded-full border border-[#7f1d1d] bg-[#2a0909] px-3 py-1.5 text-[#ffd7d7]">AI send: disabled</span>
              <span className="rounded-full border border-[#7f1d1d] bg-[#2a0909] px-3 py-1.5 text-[#ffd7d7]">AI assignment: disabled</span>
            </div>
            <p className="mt-3 text-xs text-[#8f8778]">{result.tools?.length || 0} RBAC-filtered read/preview tools available. Controlled actions require human approval.</p>
          </div>
          <p className="text-xs text-[#8f8778] lg:col-span-2">
            Mode: {result.mode.replaceAll("_", " ")} · Model: {result.model} · Estimated API cost: ${result.usage.estimatedCostUsd.toFixed(4)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
