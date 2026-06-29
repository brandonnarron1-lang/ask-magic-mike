"use client";

import { useState } from "react";

interface Props {
  agentId: string;
  leadId: string;
  currentFollowUpAt: string | null;
}

export function AgentFollowUpForm({ agentId, leadId, currentFollowUpAt }: Props) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill with existing follow-up date trimmed to minute precision for datetime-local
  const defaultValue = currentFollowUpAt
    ? new Date(currentFollowUpAt).toISOString().slice(0, 16)
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = fd.get("follow_up_at") as string | null;
    if (!raw) return;

    setSubmitting(true);
    setSaved(false);
    setError(false);

    try {
      const res = await fetch(`/api/agent/${agentId}/leads/${leadId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: new Date(raw).toISOString() }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 pt-3 border-t border-white/[0.05]">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-[9px] tracking-label uppercase text-slate-600 mb-1">
          Schedule Follow-up
        </label>
        <input
          type="datetime-local"
          name="follow_up_at"
          defaultValue={defaultValue}
          required
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs text-cream"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/[0.08] px-4 py-2 text-xs font-semibold text-cyan-400 transition-colors disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Set Follow-up"}
      </button>
      {saved && <span className="text-[10px] text-emerald-400">Saved</span>}
      {error && <span className="text-[10px] text-ruby-400">Error — try again</span>}
    </form>
  );
}
