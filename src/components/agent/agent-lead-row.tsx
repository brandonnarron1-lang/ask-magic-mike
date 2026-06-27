import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { SlaRiskBadge, FollowUpBadge } from "./sla-risk-badge";

interface AgentLeadRowProps {
  lead: {
    id: string;
    name: string | null;
    leadType: string;
    grade: string | null;
    status: string;
    temperature: string | null;
    createdAt: string;
    lastContactedAt: string | null;
    nextFollowUpAt: string | null;
    source?: string | null;
  };
  agentId: string;
  className?: string;
}

const GRADE_STYLES: Record<string, string> = {
  "A+": "text-ruby-400 border-ruby-400/35 bg-ruby-400/[0.10]",
  "A":  "text-gold-300 border-gold-400/30 bg-gold-400/[0.08]",
  "B":  "text-amber-400 border-amber-400/25 bg-amber-400/[0.06]",
  "C":  "text-slate-400 border-white/[0.08] bg-white/[0.03]",
  "D":  "text-slate-600 border-white/[0.05]",
};

const STATUS_STYLES: Record<string, string> = {
  new:       "text-cyan-400/80 border-cyan-400/20",
  scored:    "text-slate-400 border-white/[0.08]",
  assigned:  "text-amber-400/80 border-amber-400/20",
  contacted: "text-emerald-400/80 border-emerald-400/20",
  nurture:   "text-slate-500 border-white/[0.06]",
  dead:      "text-slate-700 border-white/[0.04]",
  converted: "text-gold-300 border-gold-400/20",
};

function timeAgo(isoString: string | null): string | null {
  if (!isoString) return null;
  const ms   = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AgentLeadRow({ lead, agentId, className }: AgentLeadRowProps) {
  const gradeStyle  = GRADE_STYLES[lead.grade ?? ""] ?? "text-slate-600 border-white/[0.04]";
  const statusStyle = STATUS_STYLES[lead.status] ?? STATUS_STYLES.new;
  const neverContacted = !lead.lastContactedAt;
  const lastContact    = timeAgo(lead.lastContactedAt);
  const isUrgent       = (lead.grade === "A+" || lead.grade === "A") && neverContacted;

  return (
    <Link
      href={`/agent/leads/${lead.id}?agent_id=${agentId}`}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-colors group",
        isUrgent
          ? "border-ruby-400/20 bg-ruby-400/[0.03] hover:bg-ruby-400/[0.06]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.10] hover:bg-white/[0.03]",
        className
      )}
      aria-label={`Lead: ${lead.name ?? "Anonymous"} — ${lead.status}`}
    >
      {/* Grade badge */}
      <span
        className={cn(
          "shrink-0 h-7 w-7 rounded-full border flex items-center justify-center text-[9px] font-bold",
          gradeStyle
        )}
        aria-label={`Grade: ${lead.grade ?? "ungraded"}`}
      >
        {lead.grade ?? "—"}
      </span>

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cream leading-none truncate group-hover:text-white transition-colors">
          {lead.name ?? "Anonymous Lead"}
        </p>
        <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">{lead.leadType}</p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {isUrgent && (
          <span
            className="text-[9px] font-bold tracking-label uppercase text-ruby-400 border border-ruby-400/30 bg-ruby-400/[0.08] rounded-full px-1.5 py-0.5"
            aria-label="Urgent — no contact yet"
          >
            Urgent
          </span>
        )}
        <SlaRiskBadge />
        <FollowUpBadge dueAt={lead.nextFollowUpAt} />
        <span
          className={cn(
            "text-[9px] font-semibold tracking-label uppercase border rounded-full px-1.5 py-0.5",
            statusStyle
          )}
        >
          {lead.status}
        </span>
      </div>

      {/* Timing */}
      <div className="text-right shrink-0 hidden sm:block">
        {lastContact ? (
          <p className="text-[10px] text-emerald-400/60">{lastContact}</p>
        ) : (
          <p className="text-[10px] text-slate-700">No contact</p>
        )}
        <p className="text-[9px] text-slate-700">{timeAgo(lead.createdAt)}</p>
      </div>
    </Link>
  );
}
