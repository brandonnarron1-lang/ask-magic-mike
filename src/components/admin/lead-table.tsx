"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TemperatureBadge } from "./temperature-badge";
import { ScoreDisplay } from "./score-display";
import type { AdminLeadRow, FactorLogEntry } from "@/lib/db/types";

// Re-export for backwards compatibility
export type LeadRow = AdminLeadRow;

type SortKey = "name" | "temperature" | "compositeScore" | "createdAt" | "status";
type SortDir = "asc" | "desc";

interface LeadTableProps {
  leads: AdminLeadRow[];
}

function recommendedAction(lead: AdminLeadRow): string {
  if (lead.slaBreached)              return "SLA breached — call immediately";
  if (lead.temperature === "urgent") return "Call within 2 min";
  if (lead.temperature === "hot")    return "Call within 5 min";
  if (lead.temperature === "warm")   return "Follow up today";
  if (lead.temperature === "nurture")return "Add to drip campaign";
  return "No action needed";
}

function ConsentDot({ granted }: { granted: boolean }) {
  return granted
    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
    : <XCircle    className="h-3.5 w-3.5 text-slate-600" />;
}

export function LeadTable({ leads }: LeadTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>("createdAt");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...leads].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number;
    let bv: string | number = b[sortKey] as string | number;
    if (sortKey === "compositeScore") { av = Number(av); bv = Number(bv); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp   className="h-3 w-3 text-gold-400" />
      : <ChevronDown className="h-3 w-3 text-gold-400" />;
  };

  const Col = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1.5">{label}<SortIcon k={k} /></span>
    </th>
  );

  const StaticCol = ({ label }: { label: string }) => (
    <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500 whitespace-nowrap">
      {label}
    </th>
  );

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] border-b border-white/[0.06]">
          <tr>
            <Col label="Lead"        k="name" />
            <Col label="Temperature" k="temperature" />
            <Col label="Score"       k="compositeScore" />
            <StaticCol label="Intent" />
            <StaticCol label="Source" />
            <StaticCol label="Agent" />
            <Col label="Status"  k="status" />
            <Col label="Created" k="createdAt" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map((lead) => (
            <React.Fragment key={lead.id}>
              <tr
                onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  expanded === lead.id
                    ? "bg-gold-400/[0.06]"
                    : "hover:bg-white/[0.03]",
                  lead.slaBreached && "border-l-2 border-ruby-400"
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-cream">{lead.name || "—"}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[160px]">
                    {lead.email ?? lead.phone ?? "No contact"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <TemperatureBadge temperature={lead.temperature} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bebas text-xl text-gold-400 leading-none">{lead.compositeScore}</span>
                    <span className="text-[10px] text-slate-600 tabular-nums">
                      S:{lead.sellerScore} B:{lead.buyerScore}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-300">{lead.intent}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {lead.utmSource
                    ? <span>{lead.utmSource}{lead.utmCampaign ? <><br /><span className="text-slate-600">{lead.utmCampaign}</span></> : null}</span>
                    : <span className="text-slate-700">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">{lead.agentName}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border",
                    lead.status === "assigned"  && "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
                    lead.status === "scored"    && "bg-amber-400/10  text-amber-400  border-amber-400/30",
                    lead.status === "completed" && "bg-slate-700/50  text-slate-400  border-slate-600/30",
                    lead.status === "new"       && "bg-blue-400/10   text-blue-400   border-blue-400/30",
                    lead.status === "contacted" && "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
                    lead.status === "nurture"   && "bg-blue-400/10   text-blue-400   border-blue-400/30",
                  )}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {new Date(lead.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {lead.slaBreached && <span className="ml-2 text-ruby-400 font-semibold">SLA</span>}
                </td>
              </tr>

              {expanded === lead.id && (
                <tr key={`${lead.id}-detail`} className="bg-gold-400/[0.04]">
                  <td colSpan={8} className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      {/* Column 1: Question + Address */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">Question</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{lead.question ?? "—"}</p>
                        </div>
                        {lead.addressRaw && (
                          <div>
                            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-1">Property Address</p>
                            <p className="text-sm text-slate-300">{lead.addressRaw}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-1">Recommended Action</p>
                          <p className={cn(
                            "text-sm font-medium",
                            lead.slaBreached || lead.temperature === "urgent" ? "text-ruby-400" : "text-gold-400"
                          )}>
                            {recommendedAction(lead)}
                          </p>
                        </div>
                      </div>

                      {/* Column 2: Score Breakdown */}
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-3">Score Breakdown</p>
                        <ScoreDisplay
                          sellerScore={lead.sellerScore}
                          buyerScore={lead.buyerScore}
                          compositeScore={lead.compositeScore}
                          temperature={lead.temperature}
                        />
                        {lead.factorLog.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-1.5">Factor Log</p>
                            {lead.factorLog.map((f: FactorLogEntry, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{f.label}</span>
                                <span className="text-gold-400 font-semibold tabular-nums">+{f.points}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Column 3: Consent + Attribution */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">Consent</p>
                          <div className="space-y-1.5">
                            {[
                              { label: "SMS",   granted: lead.consentSms },
                              { label: "Call",  granted: lead.consentCall },
                              { label: "Email", granted: lead.consentEmail },
                            ].map(({ label, granted }) => (
                              <div key={label} className="flex items-center gap-2 text-xs text-slate-400">
                                <ConsentDot granted={granted} />
                                <span>{label}</span>
                                <span className="text-slate-600">{granted ? "granted" : "not granted"}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">Attribution</p>
                          <div className="space-y-1 text-xs text-slate-400">
                            {lead.utmSource   && <div><span className="text-slate-600">source</span> {lead.utmSource}</div>}
                            {lead.utmCampaign && <div><span className="text-slate-600">campaign</span> {lead.utmCampaign}</div>}
                            {!lead.utmSource && !lead.utmCampaign && (
                              <div className="text-slate-600">Direct / unknown</div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}

          {leads.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                No leads yet. Submit the intake form to see data here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
