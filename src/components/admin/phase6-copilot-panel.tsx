"use client";

import { useMemo, useState } from "react";
import type { AiLeadIntelligenceResult } from "@/lib/ai/openai-responses";
import type { AiArtifactType } from "@/lib/ai/neon-intelligence";

type DraftRecord = {
  id: string;
  draft_key: string;
  version: number;
  artifact_type: string;
  channel: string | null;
  purpose: string;
  status: string;
  content: string;
  content_hash: string;
  source_fingerprint: string;
  evidence_references: string[];
  missing_facts: string[];
  limitations: string[];
  model: string;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CopilotResponse = Partial<AiLeadIntelligenceResult> & {
  ok: boolean;
  error?: string;
  replayed?: boolean;
  draft?: DraftRecord;
  context?: { deterministicControls?: { consent?: { email: boolean; sms: boolean; call: boolean }; aiCanSend?: boolean } };
};

const ARTIFACTS: Array<{ value: AiArtifactType; label: string }> = [
  { value: "lead_summary", label: "Lead summary" },
  { value: "appointment_brief", label: "Appointment brief" },
  { value: "clarifying_questions", label: "Clarifying questions" },
  { value: "email_draft", label: "Email draft" },
  { value: "sms_draft", label: "SMS draft" },
  { value: "call_script", label: "Call script" },
];

export function Phase6CopilotPanel({
  leadId,
  isTest,
  suppressed,
  initialDrafts = [],
}: {
  leadId: string;
  isTest: boolean;
  suppressed: boolean;
  initialDrafts?: DraftRecord[];
}) {
  const [artifactType, setArtifactType] = useState<AiArtifactType>("lead_summary");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.artifact_type === artifactType) || null,
    [drafts, artifactType],
  );
  const [editContent, setEditContent] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, artifactType }),
      });
      const data = (await response.json()) as CopilotResponse;
      if (!response.ok || !data.ok || !data.draft) throw new Error(data.error || "copilot_unavailable");
      setResult(data);
      setDrafts((current) => [data.draft!, ...current.filter((item) => item.draft_key !== data.draft!.draft_key)]);
      setEditContent(data.draft.content);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "copilot_unavailable";
      setError(code === "preview_mutation_disabled"
        ? "Preview is read-only. Generate durable drafts only in an authorized writable environment."
        : "The draft could not be generated. No lead, assignment, or communication state changed.");
    } finally {
      setBusy(false);
    }
  }

  async function review(action: "edit" | "approve" | "reject") {
    if (!activeDraft) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/copilot/drafts/${activeDraft.draft_key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: activeDraft.version,
          action,
          ...(action === "edit" ? { content: editContent } : {}),
        }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; version?: number; status?: string };
      if (!response.ok || !data.ok || !data.version || !data.status) throw new Error(data.error || "draft_review_failed");
      setDrafts((current) => current.map((item) => item.draft_key === activeDraft.draft_key
        ? { ...item, version: data.version!, status: data.status!, content: action === "edit" ? editContent : item.content }
        : item));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "draft_review_failed";
      setError(code === "communication_permission_missing"
        ? "Approval is blocked because the required channel and purpose permission is not currently allowed."
        : code === "stale_draft_version"
          ? "This draft changed in another session. Refresh before reviewing it."
          : code === "stale_draft_facts"
            ? "The lead facts or permissions changed. This draft was expired; generate a fresh review artifact."
          : "The review decision was not saved. No communication was sent.");
    } finally {
      setBusy(false);
    }
  }

  const reviewable = activeDraft && ["generated", "edited"].includes(activeDraft.status);
  const consent = result?.context?.deterministicControls?.consent;

  return (
    <section className="rounded-lg border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(14,116,144,.12),rgba(11,11,11,.96)_45%)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Agent Command Center · grounded drafts</p>
          <h2 className="mt-2 text-xl font-semibold text-[#f4ead4]">Human-review copilot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bdb4a4]">
            Creates one evidence-linked, versioned draft. It cannot send, assign, score, schedule, or change the lead. Approval is a recorded review decision—not delivery.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f8778]">
            Artifact
            <select
              value={artifactType}
              onChange={(event) => {
                const next = event.target.value as AiArtifactType;
                setArtifactType(next);
                const found = drafts.find((draft) => draft.artifact_type === next);
                setEditContent(found?.content || "");
                setResult(null);
              }}
              className="mt-1 block min-h-11 rounded-md border border-cyan-300/25 bg-[#050505] px-3 text-xs text-[#f4ead4]"
            >
              {ARTIFACTS.map((artifact) => <option key={artifact.value} value={artifact.value}>{artifact.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={busy || isTest || suppressed}
            className="min-h-11 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working…" : activeDraft ? "Regenerate if facts changed" : "Generate draft"}
          </button>
        </div>
      </div>

      {isTest || suppressed ? (
        <p className="mt-4 rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">
          {isTest ? "TEST RECORD — AI draft generation and contact are blocked." : "Communication is suppressed; AI draft generation is blocked."}
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">{error}</p> : null}

      {activeDraft ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
          <div className="rounded-md border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e2c06f]">{ARTIFACTS.find((item) => item.value === artifactType)?.label}</p>
              <span className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100">{activeDraft.status} · v{activeDraft.version}</span>
            </div>
            <textarea
              value={editContent || activeDraft.content}
              onChange={(event) => setEditContent(event.target.value)}
              readOnly={!reviewable}
              rows={10}
              aria-label="AI-assisted draft content"
              className="mt-4 w-full rounded-md border border-white/10 bg-[#050505] p-3 text-sm leading-6 text-[#f4ead4] outline-none focus:border-cyan-300/50 read-only:text-[#b9ae9d]"
            />
            {reviewable ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy || !editContent.trim()} onClick={() => review("edit")} className="rounded-md border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#d9ceb8] disabled:opacity-40">Save edit</button>
                <button type="button" disabled={busy} onClick={() => review("approve")} className="rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-cyan-100 disabled:opacity-40">Approve draft</button>
                <button type="button" disabled={busy} onClick={() => review("reject")} className="rounded-md border border-[#7f1d1d] bg-[#2a0909] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#ffd7d7] disabled:opacity-40">Reject</button>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-[#8f8778]">Approval records review only. Sending remains a separate, unavailable action in this panel.</p>
          </div>

          <aside className="space-y-3">
            <div className="rounded-md border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">Evidence status</p>
              <p className="mt-3 text-sm text-[#d9ceb8]">{activeDraft.evidence_references.length} durable reference{activeDraft.evidence_references.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-sm text-[#d9ceb8]">{activeDraft.missing_facts.length ? `${activeDraft.missing_facts.length} missing fact(s)` : "No missing facts declared"}</p>
              <ul className="mt-3 space-y-1 font-mono text-[10px] text-[#8f8778]">
                {activeDraft.evidence_references.map((reference) => <li key={reference}>{reference}</li>)}
              </ul>
            </div>
            <div className="rounded-md border border-[#7f1d1d66] bg-[#2a090966] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffb4b4]">Hard controls</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#ffd7d7]">
                <li>AI send: disabled</li>
                <li>Email permission: {consent?.email ? "allowed for recorded purpose" : "not established in this response"}</li>
                <li>SMS permission: {consent?.sms ? "allowed for recorded purpose" : "not established in this response"}</li>
                {activeDraft.limitations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-white/10 bg-black/30 p-4 text-sm text-[#8f8778]">No durable {ARTIFACTS.find((item) => item.value === artifactType)?.label.toLowerCase()} is recorded for this lead.</p>
      )}

      {result?.output ? (
        <details className="mt-4 rounded-md border border-white/10 bg-black/20 p-4">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">Generation evidence</summary>
          <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">{result.output.explanation}</p>
          <p className="mt-2 text-xs text-[#8f8778]">Mode: {result.mode?.replaceAll("_", " ")} · Model: {result.model} · Recorded API cost: ${result.usage?.estimatedCostUsd.toFixed(6)}</p>
        </details>
      ) : null}
    </section>
  );
}
