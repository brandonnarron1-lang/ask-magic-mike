"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminLeadInboxResult } from "../../lib/adminLeadView";

export function LeadSearchPanel() {
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<AdminLeadInboxResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search, filter: "all", sort: "newest", offset: 0 }),
      });
      const data = await response.json() as AdminLeadInboxResult & { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "search_failed");
      setResult(data);
    } catch {
      setError("Search is unavailable. No lead data was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-cyan-400/15 bg-cyan-400/[.04] p-4" aria-label="Secure lead search">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f8778]">
          Secure lead search
          <input
            required
            minLength={2}
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            placeholder="Name, email, phone, address, or lead ID"
            className="mt-1 min-h-11 w-full rounded-md border border-cyan-300/20 bg-[#050505] px-3 text-sm normal-case tracking-normal text-[#f4ead4] outline-none focus:border-cyan-300/50"
          />
        </label>
        <button disabled={busy} className="min-h-11 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-4 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-50">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      <p className="mt-2 text-xs text-[#716b61]">Search terms are sent in the authenticated request body and are not placed in the URL.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-[#ffd7d7]">{error}</p> : null}
      {result ? (
        <div className="mt-4 space-y-2" aria-live="polite">
          <p className="text-xs text-[#8f8778]">{result.page?.total || 0} authorized match{result.page?.total === 1 ? "" : "es"}</p>
          {result.leads.map((lead) => (
            <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-3 hover:border-cyan-300/30">
              <span>
                <span className="block text-sm font-semibold text-[#f4ead4]">{lead.primary_detail}</span>
                <span className="mt-1 block text-xs text-[#8f8778]">{lead.contact_summary}</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">{lead.status}</span>
            </Link>
          ))}
          {!result.leads.length ? <p className="text-sm text-[#8f8778]">No authorized leads match that search.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
