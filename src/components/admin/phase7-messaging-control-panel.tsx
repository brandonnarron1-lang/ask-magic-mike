"use client";

import { useCallback, useEffect, useState } from "react";

type PermissionDecision = {
  allowed: boolean;
  code: string;
  explanation: string;
  requiresHumanApproval: boolean;
};

type PermissionResponse = {
  ok: boolean;
  reviewMatrix: Array<{ channel: string; purpose: string; decision: PermissionDecision }>;
  release: { consumerEmail: boolean; consumerSms: boolean; autoSend: boolean };
};

type Sequence = {
  id: string;
  sequence_id: string;
  sequence_version: string;
  status: string;
  stop_reason?: string | null;
  steps?: Array<{ id: string; stepIndex: number; templateId: string; status: string }>;
};

type SequenceResponse = {
  ok: boolean;
  sequences: Sequence[];
  definitions: Array<{ id: string; group: string; steps: unknown[] }>;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function Phase7MessagingControlPanel({ leadId }: { leadId: string }) {
  const [permissions, setPermissions] = useState<PermissionResponse | null>(null);
  const [sequences, setSequences] = useState<SequenceResponse | null>(null);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [permissionResponse, sequenceResponse] = await Promise.all([
        fetch(`/api/admin/leads/${leadId}/communication-permissions`, { cache: "no-store" }),
        fetch(`/api/admin/leads/${leadId}/sequences`, { cache: "no-store" }),
      ]);
      const permissionData = await permissionResponse.json() as PermissionResponse;
      const sequenceData = await sequenceResponse.json() as SequenceResponse;
      if (!permissionResponse.ok || !permissionData.ok || !sequenceResponse.ok || !sequenceData.ok) throw new Error("control_load_failed");
      setPermissions(permissionData);
      setSequences(sequenceData);
      setSelectedSequence((current) => current || sequenceData.definitions[0]?.id || "");
      setError("");
    } catch {
      setError("Messaging controls could not be loaded. No communication state changed.");
    }
  }, [leadId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function post(path: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "control_update_failed");
      await refresh();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "control_update_failed";
      setError(code === "sequence_scheduler_disabled"
        ? "Scheduling is intentionally disabled. The sequence remains approval-only."
        : "The control update was not saved. No message was sent.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="rounded-xl border border-[#cda24a33] bg-[linear-gradient(145deg,rgba(139,16,32,.14),rgba(11,11,11,.98)_48%)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Phase 7 control plane</p>
          <h2 className="mt-2 text-xl font-semibold text-[#f4ead4]">Communication permissions & sequences</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#bdb4a4]">
            Purpose-specific decisions, version-pinned sequence drafts, and stop conditions. This panel cannot send email or SMS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
          <span className="rounded-full border border-[#7f1d1d] bg-[#2a0909] px-3 py-1.5 text-[#ffd7d7]">Auto-send off</span>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">Audit on</span>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3 text-sm text-[#ffd7d7]">{error}</p> : null}
      {!permissions || !sequences ? <p className="mt-5 text-sm text-[#8f8778]">Loading permission and sequence controls…</p> : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Permission matrix</h3>
              <span className="text-xs text-[#8f8778]">Recorded consent never implies every purpose.</span>
            </div>
            <div className="mt-3 space-y-2">
              {permissions.reviewMatrix.map((row) => (
                <article key={`${row.channel}:${row.purpose}`} className="rounded-lg border border-white/10 bg-black/35 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#f4ead4]">{label(row.purpose)}</p>
                      <p className="mt-1 text-xs text-[#8f8778]">{row.channel} · {label(row.decision.code)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${row.decision.allowed ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : row.decision.requiresHumanApproval ? "border-[#cda24a33] bg-[#cda24a14] text-[#e2c06f]" : "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7]"}`}>
                      {row.decision.allowed ? "allowed" : row.decision.requiresHumanApproval ? "review" : "blocked"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#bdb4a4]">{row.decision.explanation}</p>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => post(`/api/admin/leads/${leadId}/communication-permissions`, {
                      channel: row.channel, purpose: row.purpose, humanApproved: false,
                    }, `permission:${row.channel}:${row.purpose}`)}
                    className="mt-3 min-h-10 rounded-md border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9ceb8] hover:border-[#cda24a66] disabled:opacity-50"
                  >
                    {busy === `permission:${row.channel}:${row.purpose}` ? "Recording…" : "Record decision"}
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Sequence workspace</h3>
            <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-4">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f8778]">
                Versioned draft
                <select value={selectedSequence} onChange={(event) => setSelectedSequence(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-3 text-sm text-[#f4ead4]">
                  {sequences.definitions.map((definition) => <option key={definition.id} value={definition.id}>{label(definition.group)} · {definition.steps.length} steps</option>)}
                </select>
              </label>
              <button
                type="button"
                disabled={Boolean(busy) || !selectedSequence}
                onClick={() => post(`/api/admin/leads/${leadId}/sequences`, { operation: "create", sequenceId: selectedSequence }, "sequence:create")}
                className="mt-3 min-h-11 w-full rounded-md border border-[#cda24a66] bg-[#cda24a14] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4] disabled:opacity-50"
              >
                {busy === "sequence:create" ? "Creating…" : "Create safe draft"}
              </button>
              <p className="mt-3 text-xs leading-5 text-[#8f8778]">Draft creation does not queue or send a message. Test, suppressed, duplicate, opt-out, and terminal leads are blocked.</p>
            </div>
            <div className="mt-3 space-y-3">
              {sequences.sequences.length ? sequences.sequences.map((sequence) => (
                <article key={sequence.id} className="rounded-lg border border-white/10 bg-black/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="text-sm font-semibold text-[#f4ead4]">{label(sequence.sequence_id)}</p><p className="mt-1 text-xs text-[#8f8778]">Version {sequence.sequence_version} · {sequence.steps?.length || 0} steps</p></div>
                    <span className="rounded-full border border-[#cda24a33] px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[#e2c06f]">{label(sequence.status)}</span>
                  </div>
                  {sequence.stop_reason ? <p className="mt-3 text-xs text-[#ffd7d7]">Stopped: {label(sequence.stop_reason)}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sequence.status === "draft" ? <button type="button" disabled={Boolean(busy)} onClick={() => post(`/api/admin/leads/${leadId}/sequences`, { operation: "transition", sequenceInstanceId: sequence.id, action: "request_approval" }, `sequence:${sequence.id}`)} className="min-h-10 rounded-md border border-[#cda24a33] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#e2c06f]">Request approval</button> : null}
                    {["approval_required", "scheduled"].includes(sequence.status) ? <button type="button" disabled={Boolean(busy)} onClick={() => post(`/api/admin/leads/${leadId}/sequences`, { operation: "transition", sequenceInstanceId: sequence.id, action: "pause" }, `sequence:${sequence.id}`)} className="min-h-10 rounded-md border border-white/10 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d9ceb8]">Pause</button> : null}
                    {["draft", "approval_required", "scheduled", "paused", "blocked"].includes(sequence.status) ? <button type="button" disabled={Boolean(busy)} onClick={() => post(`/api/admin/leads/${leadId}/sequences`, { operation: "transition", sequenceInstanceId: sequence.id, action: "cancel" }, `sequence:${sequence.id}`)} className="min-h-10 rounded-md border border-[#7f1d1d] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#ffd7d7]">Cancel</button> : null}
                  </div>
                </article>
              )) : <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-[#8f8778]">No sequence has been created for this lead.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

