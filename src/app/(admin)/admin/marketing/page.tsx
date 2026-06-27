export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { QrCode, Megaphone, Link2, FileText, MessageSquare, Calendar } from "lucide-react";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { CampaignCard, CampaignChip } from "@/components/admin/campaign-card";
import { PlatformPostPreview } from "@/components/admin/platform-post-preview";
import { CopyBlock } from "@/components/admin/copy-block";
import {
  ALL_CAMPAIGNS,
  buildCampaignAssets,
  type CampaignSlug,
} from "@/lib/admin/campaign-assets";

// ---------------------------------------------------------------------------
// Campaign slug validation
// ---------------------------------------------------------------------------

const VALID_SLUGS = ALL_CAMPAIGNS.map((c) => c.slug);

function isValidSlug(s: string | undefined): s is CampaignSlug {
  return !!s && (VALID_SLUGS as string[]).includes(s);
}

// ---------------------------------------------------------------------------
// Section component helper
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-gold-400/60 shrink-0" aria-hidden="true" />
        <AdminSectionHeading>{title}</AdminSectionHeading>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MarketingCommandPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawSlug = Array.isArray(sp.campaign) ? sp.campaign[0] : sp.campaign;
  const activeSlug: CampaignSlug = isValidSlug(rawSlug) ? rawSlug : "amm_launch";

  const assets = buildCampaignAssets(activeSlug);
  const { campaign, utmLinks, socialPosts } = assets;

  return (
    <AdminShell
      title="Marketing Command"
      eyebrow="Ask Magic Mike · Campaign Assets"
      backHref="/admin"
      backLabel="← dashboard"
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Campaign selector ── */}
        <div>
          <AdminSectionHeading className="mb-3">Select Campaign</AdminSectionHeading>
          <div className="flex flex-wrap gap-2">
            {ALL_CAMPAIGNS.map((c) => (
              <CampaignChip
                key={c.slug}
                campaign={c}
                href={`?campaign=${c.slug}`}
                active={c.slug === activeSlug}
              />
            ))}
          </div>
        </div>

        {/* ── Campaign overview ── */}
        <Section icon={Megaphone} title="Active Campaign">
          <CampaignCard campaign={campaign} active />
        </Section>

        {/* ── UTM link bank ── */}
        <Section icon={Link2} title="UTM Link Bank">
          <p className="text-xs text-slate-500 mb-4">
            Copy each link manually into the native platform. This system never posts on your behalf.
            Links use <code className="text-amber-400/80">askmagicmike.com</code> only — never{" "}
            <code className="text-ruby-400/70">ourtownproperties.com</code> (Facebook preview will fail).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {utmLinks.map((link) => (
              <div
                key={link.platform}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/80">
                    {link.platformLabel}
                  </p>
                  {!link.safeToPostOnFacebook && link.platform !== "email_signature" && link.platform !== "qr_flyer" && (
                    <span className="shrink-0 text-[9px] text-slate-600 uppercase tracking-widest border border-white/[0.06] px-1.5 py-0.5 rounded">
                      Social only
                    </span>
                  )}
                  {link.safeToPostOnFacebook && (
                    <span className="shrink-0 text-[9px] text-emerald-400/70 uppercase tracking-widest border border-emerald-400/20 px-1.5 py-0.5 rounded">
                      FB-safe
                    </span>
                  )}
                </div>

                <CopyBlock
                  label="Full UTM URL"
                  content={link.fullUrl}
                  mono
                />

                <p className="mt-2 text-[10.5px] text-slate-600 leading-snug">
                  {link.placementNote}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Brand copy blocks ── */}
        <Section icon={FileText} title="Brand Copy Blocks">
          <p className="text-xs text-slate-500 mb-4">
            Approved copy for <span className="text-cream font-semibold">{campaign.name}</span>.
            Edit to match your voice before publishing. Never use AI-generated copy that hasn&rsquo;t
            been reviewed against fair housing standards.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CopyBlock
              label="Short · X / SMS / Pull Quote"
              sublabel={`≤140 chars · current: ${campaign.copyBlock.socialShort.length}`}
              content={campaign.copyBlock.socialShort}
              charLimit={140}
            />
            <CopyBlock
              label="Medium · Threads / IG Caption"
              sublabel={`≤500 chars · current: ${campaign.copyBlock.socialMedium.length}`}
              content={campaign.copyBlock.socialMedium}
              charLimit={500}
            />
            <CopyBlock
              label="Full Post · Facebook / LinkedIn"
              sublabel="No practical limit — use for long-form"
              content={campaign.copyBlock.socialFull}
            />
            <div className="space-y-3">
              <CopyBlock
                label="Email Subject Line"
                content={campaign.copyBlock.emailSubject}
              />
              <CopyBlock
                label="Email Body"
                content={campaign.copyBlock.emailBody}
              />
            </div>
          </div>

          {/* Hashtag bank */}
          <div className="mt-4">
            <AdminSectionHeading className="mb-2">Hashtag Bank</AdminSectionHeading>
            <CopyBlock
              label="Campaign Hashtags"
              sublabel="Copy all — paste at end of any post"
              content={campaign.copyBlock.hashtags.join(" ")}
            />
          </div>

          {/* Comment-capture hook (only for comment_lead) */}
          {campaign.copyBlock.commentCapture && (
            <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/[0.03] p-4">
              <p className="text-[10.5px] tracking-label uppercase font-semibold text-blue-400/80 mb-3">
                Comment-to-Lead Hook
              </p>
              <CopyBlock
                label="Facebook / Instagram Comment Prompt"
                sublabel="Add as the last line of your post"
                content={campaign.copyBlock.commentCapture}
              />
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-400">Manual follow-up flow:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  <li>Watch for comments containing &ldquo;WILSON&rdquo;</li>
                  <li>Reply publicly: &ldquo;Sent you a message!&rdquo;</li>
                  <li>DM the commenter with the Ask link: askmagicmike.com/ask</li>
                  <li>Log the lead manually if they convert</li>
                </ol>
                <p className="text-slate-600 mt-2">
                  This system does not read or post to social media — all follow-up is manual.
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* ── Platform post templates ── */}
        <Section icon={MessageSquare} title="Platform Post Templates">
          <p className="text-xs text-slate-500 mb-4">
            These templates are generated from the campaign&rsquo;s copy block and categorized
            by platform character limits. Review before posting — the source question shown
            is derived from campaign content, not from a live lead.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <PlatformPostPreview post={socialPosts.facebook} />
              <CopyBlock
                label="Copy Facebook post text"
                content={socialPosts.facebook.body}
                charLimit={63206}
              />
            </div>
            <div className="space-y-3">
              <PlatformPostPreview post={socialPosts.linkedin} />
              <CopyBlock
                label="Copy LinkedIn post text"
                content={socialPosts.linkedin.body}
                charLimit={3000}
              />
            </div>
            <div className="space-y-3">
              <PlatformPostPreview post={socialPosts.threads} />
              <CopyBlock
                label="Copy Threads post text"
                content={socialPosts.threads.body}
                charLimit={500}
              />
            </div>
            <div className="space-y-3">
              <PlatformPostPreview post={socialPosts.x} />
              <CopyBlock
                label="Copy X post text"
                content={socialPosts.x.body}
                charLimit={280}
              />
            </div>
          </div>
        </Section>

        {/* ── QR / Flyer asset spec ── */}
        <Section icon={QrCode} title="QR / Flyer Asset Spec">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Flyer content spec */}
              <div className="space-y-3">
                <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/80 mb-1">
                  Print Content Spec
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[10.5px] tracking-label uppercase text-slate-600">Headline</span>
                    <p className="text-cream font-semibold mt-0.5">{campaign.flyer.headline}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] tracking-label uppercase text-slate-600">Subhead</span>
                    <p className="text-slate-300 mt-0.5">{campaign.flyer.subhead}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] tracking-label uppercase text-slate-600">Body</span>
                    <p className="text-slate-400 mt-0.5 whitespace-pre-line text-xs">{campaign.flyer.body}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] tracking-label uppercase text-slate-600">CTA</span>
                    <p className="text-gold-300 font-semibold mt-0.5">{campaign.flyer.cta}</p>
                  </div>
                  <div>
                    <span className="text-[10.5px] tracking-label uppercase text-slate-600">Display URL</span>
                    <p className="font-mono text-sm text-slate-300 mt-0.5">{campaign.flyer.displayUrl}</p>
                  </div>
                </div>
              </div>

              {/* QR URL + instructions */}
              <div className="space-y-3">
                <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/80 mb-1">
                  QR Code Target URL
                </p>
                <CopyBlock
                  label="Encode this URL into the QR code"
                  content={campaign.flyer.qrUrl}
                  mono
                />
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3">
                  <p className="text-[10.5px] tracking-label uppercase font-semibold text-amber-400/80 mb-2">
                    Print Notes
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{campaign.flyer.printNote}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-1.5 text-xs text-slate-500">
                  <p className="text-slate-400 font-semibold">QR code generator notes:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>Use a free generator (qr-code-generator.com, qrcode-monkey.com)</li>
                    <li>Export SVG for print — not PNG (pixelates at large sizes)</li>
                    <li>Add error correction level H for printed materials</li>
                    <li>Test scan before printing at full quantity</li>
                    <li>Do not shorten the URL — UTM parameters must be preserved</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Weekly content calendar ── */}
        <Section icon={Calendar} title="Weekly Publishing Plan">
          <p className="text-xs text-slate-500 mb-4">
            Suggested cadence for{" "}
            <span className="text-cream font-semibold">{campaign.name}</span> content.
            Adjust to actual platform performance. One campaign per week is the recommended maximum.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { day: "Monday",    platform: "Facebook",  copy: "Full post (long-form story)" },
              { day: "Tuesday",   platform: "LinkedIn",  copy: "Professional take / market insight" },
              { day: "Wednesday", platform: "Threads",   copy: "Short-form / engagement question" },
              { day: "Thursday",  platform: "X",         copy: "140-char hook with link" },
              { day: "Friday",    platform: "Instagram", copy: "Image post with caption + bio link" },
            ].map(({ day, platform, copy }) => (
              <div
                key={day}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/70 mb-1">{day}</p>
                <p className="text-sm font-medium text-cream mb-1">{platform}</p>
                <p className="text-[10.5px] text-slate-500 leading-snug">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.01] px-4 py-3">
            <p className="text-xs text-slate-600">
              This system generates copy only — it does not schedule or post content.
              Use each platform&rsquo;s native scheduler (Meta Business Suite, LinkedIn Scheduler)
              or a tool like Buffer. All posting is manual and owner-controlled.
            </p>
          </div>
        </Section>

        {/* ── All campaign cards ── */}
        <Section icon={Megaphone} title="All Campaigns">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_CAMPAIGNS.map((c) => (
              <CampaignCard
                key={c.slug}
                campaign={c}
                href={`?campaign=${c.slug}`}
                active={c.slug === activeSlug}
              />
            ))}
          </div>
        </Section>

        <p className="text-xs text-slate-700 text-center pb-4">
          Marketing Command · Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC ·{" "}
          No outbound posting. No paid APIs. All copy is manual-review only.
        </p>
      </main>
    </AdminShell>
  );
}
