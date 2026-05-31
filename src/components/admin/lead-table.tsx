"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TemperatureBadge } from "./temperature-badge";
import { ScoreDisplay } from "./score-display";
import type { Temperature } from "@/types/domain.types";

export interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  intent: string;
  question: string | null;
  temperature: Temperature;
  sellerScore: number;
  buyerScore: number;
  compositeScore: number;
  agentName: string;
  status: string;
  createdAt: string;
  slaBreached: boolean;
}

type SortKey = "name" | "temperature" | "compositeScore" | "createdAt" | "status";
type SortDir = "asc" | "desc";

interface LeadTableProps {
  leads: LeadRow[];
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
      ? <ChevronUp className="h-3 w-3 text-gold-400" />
      : <ChevronDown className="h-3 w-3 text-gold-400" />;
  };

  const Col = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1.5">{label}<SortIcon k={k} /></span>
    </th>
  );

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] border-b border-white/[0.06]">
          <tr>
            <Col label="Lead"        k="name" />
            <Col label="Temperature" k="temperature" />
            <Col label="Score"       k="compositeScore" />
            <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500">Intent</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500">Agent</th>
            <Col label="Status"  k="status" />
            <Col label="Created" k="createdAt" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map((lead) => (
            <>
              <tr
                key={lead.id}
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
                  <div className="text-xs text-slate-500">{lead.email ?? lead.phone ?? "No contact"}</div>
                </td>
                <td className="px-4 py-3">
                  <TemperatureBadge temperature={lead.temperature} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-bebas text-xl text-gold-400 leading-none">{lead.compositeScore}</span>
                </td>
                <td className="px-4 py-3 capitalize text-slate-300">{lead.intent}</td>
                <td className="px-4 py-3 text-slate-300">{lead.agentName}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border",
                    lead.status === "assigned"  && "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
                    lead.status === "scored"    && "bg-amber-400/10  text-amber-400  border-amber-400/30",
                    lead.status === "completed" && "bg-slate-700/50  text-slate-400  border-slate-600/30",
                    lead.status === "new"       && "bg-blue-400/10   text-blue-400   border-blue-400/30",
                  )}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                  {new Date(lead.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {lead.slaBreached && <span className="ml-2 text-ruby-400 font-semibold">SLA</span>}
                </td>
              </tr>
              {expanded === lead.id && (
                <tr key={`${lead.id}-detail`} className="bg-gold-400/[0.04]">
                  <td colSpan={7} className="px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2">Question</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{lead.question ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-3">Score Breakdown</p>
                        <ScoreDisplay
                          sellerScore={lead.sellerScore}
                          buyerScore={lead.buyerScore}
                          compositeScore={lead.compositeScore}
                          temperature={lead.temperature}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                No leads yet. Submit the intake form to see data here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
