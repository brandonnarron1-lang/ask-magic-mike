import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Campaign, CampaignStatus } from "@/lib/admin/campaign-assets";

// ---------------------------------------------------------------------------
// Status styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active:  "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  draft:   "bg-slate-700/50 text-slate-400 border-slate-600/30",
  paused:  "bg-amber-400/10 text-amber-400 border-amber-400/30",
};

const STATUS_DOT: Record<CampaignStatus, string> = {
  active: "bg-emerald-400",
  draft:  "bg-slate-500",
  paused: "bg-amber-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CampaignCardProps {
  campaign: Campaign;
  /** If set, clicking the card navigates to this href */
  href?: string;
  /** Whether this card is the currently selected campaign */
  active?: boolean;
  className?: string;
}

export function CampaignCard({ campaign, href, active, className }: CampaignCardProps) {
  const inner = (
    <div
      className={cn(
        "rounded-xl border p-5 transition-all duration-200",
        active
          ? "border-gold-400/40 bg-gold-400/[0.05]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.035]",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/80 mb-0.5">
            Campaign
          </p>
          <h3 className="font-display text-lg font-semibold text-cream leading-tight truncate">
            {campaign.name}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
            STATUS_STYLES[campaign.status]
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[campaign.status])} aria-hidden="true" />
          {campaign.status}
        </span>
      </div>

      {/* Tagline */}
      <p className="text-sm text-slate-400 leading-snug mb-4">{campaign.tagline}</p>

      {/* Metadata */}
      <div className="space-y-2 text-[10.5px]">
        <div className="flex gap-2">
          <span className="text-slate-600 shrink-0 w-20">Audience</span>
          <span className="text-slate-400 leading-tight">{campaign.targetAudience}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 shrink-0 w-20">Primary CTA</span>
          <span className="text-gold-300/85 font-medium">{campaign.primaryCta}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 shrink-0 w-20">Landing</span>
          <span className="font-mono text-slate-400">
            askmagicmike.com{campaign.landingPath}
          </span>
        </div>
      </div>

      {/* Footer */}
      {href && (
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {campaign.copyBlock.hashtags.slice(0, 3).join(" ")}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] text-slate-500 group-hover:text-gold-300 transition-colors">
            View assets
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {inner}
      </Link>
    );
  }

  return inner;
}

// ---------------------------------------------------------------------------
// Compact campaign selector chip (used in page header)
// ---------------------------------------------------------------------------

interface CampaignChipProps {
  campaign: Campaign;
  href: string;
  active: boolean;
}

export function CampaignChip({ campaign, href, active }: CampaignChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
        active
          ? "border-gold-400/50 bg-gold-400/[0.12] text-gold-300"
          : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.14] hover:text-slate-200"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          STATUS_DOT[campaign.status]
        )}
        aria-hidden="true"
      />
      {campaign.name}
    </Link>
  );
}
