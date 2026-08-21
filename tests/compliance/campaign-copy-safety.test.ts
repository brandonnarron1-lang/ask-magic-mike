import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllCampaignAssets } from "../../src/lib/admin/campaign-assets";
import { CAMPAIGN_PRESETS } from "../../src/lib/content/campaign-presets";

const FORBIDDEN_PUBLIC_CLAIMS = [
  { id: "unverified_volume_or_tenure", pattern: /(?:\$750m\+?|\b2,?500\+?|\b30\+\s*years|\bover 30 years|\bsince 1993|\bthree decades)\b/i },
  { id: "absolute_personal_response", pattern: /\b(?:personally|every question|every inquiry|i answer)\b/i },
  { id: "unsupported_avm_error", pattern: /online (?:estimates|tools)[^.!?]{0,100}(?:off by|haven't kept up)|\b10\s*(?:to|-|–)\s*20 percent\b/i },
  { id: "unsupported_dollar_loss", pattern: /\$(?:20,000|30,000|40,000|70,000)\b/i },
  { id: "unsupported_buyer_demand", pattern: /\bthree buyers (?:are )?actively looking\b/i },
  { id: "unverified_superlative", pattern: /\b(?:go-to broker|most experienced broker|knows? Wilson real estate better than anyone|local real estate authority)\b/i },
  { id: "steering_or_school_proxy", pattern: /\b(?:school zone|school-desirable|neighborhood ranking|best neighborhood)\b/i },
  { id: "unverifiable_contact_promise", pattern: /\b(?:no spam|no email list|no follow-up sales call|no call centers|no bots)\b/i },
  { id: "unverified_completion_time", pattern: /\btakes? (?:about )?60 seconds\b/i },
  { id: "unsupported_exact_market_claim", pattern: /\b(?:tell you exactly|exactly where your home stands|what a buyer[^.!?]{0,80}would actually pay)\b/i },
  { id: "unsupported_market_stat", pattern: /(?:inventory[^.!?]{0,60}\d+%|median[^.!?]{0,60}\$\d+|\b12\s*(?:to|-|–)\s*21 days|\b3\s*(?:to|-|–)\s*7%)/i },
  { id: "unsupported_transaction_outcome", pattern: /\b(?:negotiates every dollar|prices to win|finds a way|when others can(?:no|'?t))\b/i },
] as const;

function sourceTree(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceTree(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [readFileSync(target, "utf8")] : [];
  });
}

function retainedMarketingSource() {
  const repo = process.cwd();
  return [
    ...sourceTree(path.join(repo, "src/components/amm")),
    ...sourceTree(path.join(repo, "src/components/campaign")),
    ...sourceTree(path.join(repo, "src/components/intake")),
    ...sourceTree(path.join(repo, "src/components/landing")),
    ...sourceTree(path.join(repo, "src/app/(campaign)")),
    readFileSync(path.join(repo, "src/app/page.tsx"), "utf8"),
    readFileSync(path.join(repo, "src/lib/admin/campaign-assets.ts"), "utf8"),
    readFileSync(path.join(repo, "src/lib/content/campaign-presets.ts"), "utf8"),
    readFileSync(path.join(repo, "src/lib/site-config.ts"), "utf8"),
  ].join("\n");
}

function activeAskSource() {
  const repo = process.cwd();
  return [
    readFileSync(path.join(repo, "app/ask/page.tsx"), "utf8"),
    readFileSync(path.join(repo, "app/components/black-diamond/AskMikeChatPanel.tsx"), "utf8"),
    readFileSync(path.join(repo, "app/lib/constants.ts"), "utf8"),
  ].join("\n");
}

function campaignAssetCopy() {
  return getAllCampaignAssets().flatMap(({ campaign }) => [
    campaign.name,
    campaign.tagline,
    campaign.targetAudience,
    campaign.primaryCta,
    campaign.copyBlock.headline,
    campaign.copyBlock.subhead,
    campaign.copyBlock.socialShort,
    campaign.copyBlock.socialMedium,
    campaign.copyBlock.socialFull,
    campaign.copyBlock.emailSubject,
    campaign.copyBlock.emailBody,
    campaign.copyBlock.cta,
    campaign.copyBlock.flyerHeadline,
    campaign.copyBlock.flyerBody,
    campaign.copyBlock.commentCapture ?? "",
    campaign.flyer.headline,
    campaign.flyer.subhead,
    campaign.flyer.body,
    campaign.flyer.cta,
  ]);
}

function presetCopy() {
  return CAMPAIGN_PRESETS.flatMap((preset) => [
    preset.label,
    preset.description,
    preset.headline,
    preset.shortCaption,
    preset.longCaption,
    preset.emailSubject ?? "",
    preset.emailBody ?? "",
    preset.videoScript ?? "",
    preset.ctaLabel,
  ]);
}

describe("campaign copy safety", () => {
  it("keeps legacy and canonical campaign libraries free of unsupported public claims", () => {
    const copy = [...campaignAssetCopy(), ...presetCopy(), retainedMarketingSource()].join("\n");
    for (const claim of FORBIDDEN_PUBLIC_CLAIMS) {
      expect(copy, claim.id).not.toMatch(claim.pattern);
    }
  });

  it("does not publish an unapproved or conflicting phone number from retained marketing code", () => {
    const source = retainedMarketingSource();

    expect(source).not.toMatch(/252[-.() ]*245[-.() ]*4337|252[-.() ]*341[-.() ]*0645/);
    expect(source).toContain("252-243-7700");
  });

  it("keeps every campaign destination on the canonical HTTPS host", () => {
    const urls = [
      ...getAllCampaignAssets().flatMap((asset) => [
        asset.campaign.flyer.qrUrl,
        ...asset.utmLinks.map((link) => link.fullUrl),
      ]),
      ...CAMPAIGN_PRESETS.map((preset) => preset.ctaUrl),
    ];

    for (const value of urls) {
      const url = new URL(value.replaceAll("[MLSID]", "verified-listing-id"));
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.askmagicmike.com");
      expect(url.searchParams.get("utm_source")).toBeTruthy();
      expect(url.searchParams.get("utm_medium")).toBeTruthy();
      expect(url.searchParams.get("utm_campaign")).toBeTruthy();
    }
  });

  it("keeps the active Ask flow on objective property criteria instead of steering prompts", () => {
    const source = activeAskSource();
    expect(source).not.toMatch(/\b(?:compare neighborhoods?|best neighborhoods?|school district|buyer demand|buyers looking for)\b/i);
    expect(source).toContain("objective criteria you choose");
    expect(source).toContain("compare properties using my stated needs");
  });
});
