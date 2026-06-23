/**
 * Traffic Launch Readiness
 *
 * Pure read-only helpers. No writes. No API calls. No outbound.
 *
 * Tracks which posting domains are safe RIGHT NOW, why OTP Facebook
 * links are blocked, and what the operator should do next.
 *
 * To mark OTP Facebook links safe: change OTP_FACEBOOK_SAFE to true
 * AND document the Regency/host WAF whitelist confirmation here.
 */

// ---------------------------------------------------------------------------
// Constants — single source of truth for launch gate state
// ---------------------------------------------------------------------------

/** AMM links (askmagicmike.com) are Vercel-hosted and have no social crawler WAF block. */
const AMM_LINKS_SAFE = true;

/**
 * OTP Facebook links are blocked at the Liquid Web / cPanel WAF level.
 * facebookexternalhit/1.1 receives HTTP 403 on ourtownproperties.com.
 * Set to true ONLY after Regency/host confirms WAF whitelist is applied
 * and pnpm run amm:verify:social-preview returns 42/42.
 */
const OTP_FACEBOOK_SAFE = false;

const RECOMMENDED_PRIMARY_POSTING_DOMAIN = "askmagicmike.com";
const BLOCKED_DOMAIN = "ourtownproperties.com";
const BLOCKER_REASON =
  "facebookexternalhit/1.1 returns HTTP 403 on ourtownproperties.com — pending Regency/host WAF whitelist";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaunchReadinessItem {
  label: string;
  safe: boolean;
  note: string;
}

export interface LaunchChecklistItem {
  step: number;
  action: string;
  status: "done" | "blocked" | "waiting";
  blockerNote?: string;
}

export interface LaunchReadiness {
  ammLinksSafe: boolean;
  otpFacebookLinksSafe: boolean;
  recommendedPrimaryPostingDomain: string;
  blockedDomain: string;
  blockerReason: string;
  doNotPostList: DoNotPostItem[];
  launchChecklist: LaunchChecklistItem[];
  nextBestAction: string;
  socialPreviewScore: string;
}

export interface DoNotPostItem {
  url: string;
  platform: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildLaunchReadiness(): LaunchReadiness {
  const doNotPostList: DoNotPostItem[] = [
    {
      url: "https://www.ourtownproperties.com/ask-mike/",
      platform: "Facebook",
      reason:
        "facebookexternalhit receives HTTP 403 — preview card will be blank. Use the AMM link instead.",
    },
    {
      url: "https://www.ourtownproperties.com/agents/mike-eatmon/",
      platform: "Facebook",
      reason:
        "Same host WAF block. Facebook cannot scrape OG tags. Post the AMM value page instead.",
    },
  ];

  const launchChecklist: LaunchChecklistItem[] = [
    {
      step: 1,
      action: "Confirm AMM funnel returns 200 (pnpm run amm:verify:funnel)",
      status: "done",
    },
    {
      step: 2,
      action: "Confirm askmagicmike.com Facebook previews pass (social-preview score 3/3 AMM URLs)",
      status: "done",
    },
    {
      step: 3,
      action: "Post AMM links (askmagicmike.com/ask, /value) on Facebook, Instagram, LinkedIn, X, Threads",
      status: "waiting",
    },
    {
      step: 4,
      action: "Contact Regency/Liquid Web to whitelist facebookexternalhit for ourtownproperties.com",
      status: OTP_FACEBOOK_SAFE ? "done" : "blocked",
      blockerNote: OTP_FACEBOOK_SAFE
        ? undefined
        : "External host action required — no code change resolves this",
    },
    {
      step: 5,
      action:
        "After host WAF fix: run pnpm run amm:verify:social-preview and confirm 42/42. Then post OTP links.",
      status: OTP_FACEBOOK_SAFE ? "done" : "blocked",
      blockerNote: OTP_FACEBOOK_SAFE ? undefined : "Waiting on step 4",
    },
  ];

  const nextBestAction = AMM_LINKS_SAFE
    ? "Post askmagicmike.com links now. Use the UTM Copy Bank to get pre-built tracked links for each platform. Do not post ourtownproperties.com links on Facebook until Regency resolves the WAF block."
    : "AMM links are not verified safe. Run pnpm run amm:verify:social-preview before posting.";

  return {
    ammLinksSafe: AMM_LINKS_SAFE,
    otpFacebookLinksSafe: OTP_FACEBOOK_SAFE,
    recommendedPrimaryPostingDomain: RECOMMENDED_PRIMARY_POSTING_DOMAIN,
    blockedDomain: BLOCKED_DOMAIN,
    blockerReason: BLOCKER_REASON,
    doNotPostList,
    launchChecklist,
    nextBestAction,
    socialPreviewScore: "40/42 — AMM 3/3 ✓, OTP 2 Facebook blocks pending host fix",
  };
}
