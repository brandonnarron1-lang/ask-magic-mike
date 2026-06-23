/**
 * Source Attribution Rollup
 *
 * Normalizes raw utm_source / referrer_type strings into canonical display
 * labels and groups them into platform buckets.
 *
 * Read-only. No writes. No outbound calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrafficPlatform =
  | "Facebook"
  | "Instagram"
  | "Threads"
  | "LinkedIn"
  | "X / Twitter"
  | "YouTube"
  | "Email"
  | "Direct"
  | "QR Code"
  | "Website Widget"
  | "Google"
  | "Bing"
  | "Organic Search"
  | "Referral"
  | "Other";

export interface SourceRollupRow {
  platform: TrafficPlatform;
  rawSource: string | null;
  count: number;
  isPaid: boolean;
}

export interface SourceRollupSummary {
  byPlatform: Record<TrafficPlatform, number>;
  organicCount: number;
  paidCount: number;
  socialCount: number;
  directCount: number;
  topPlatform: TrafficPlatform | null;
  rows: SourceRollupRow[];
}

// ---------------------------------------------------------------------------
// Platform normalization map
// ---------------------------------------------------------------------------

const SOURCE_TO_PLATFORM: Record<string, TrafficPlatform> = {
  // Facebook variants
  facebook: "Facebook",
  facebook_page: "Facebook",
  facebook_group: "Facebook",
  fb: "Facebook",
  "facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "lm.facebook.com": "Facebook",

  // Instagram
  instagram: "Instagram",
  ig: "Instagram",
  "instagram.com": "Instagram",

  // Threads
  threads: "Threads",
  "threads.net": "Threads",

  // LinkedIn
  linkedin: "LinkedIn",
  li: "LinkedIn",
  "linkedin.com": "LinkedIn",
  "lnkd.in": "LinkedIn",

  // X / Twitter
  x: "X / Twitter",
  twitter: "X / Twitter",
  "x.com": "X / Twitter",
  "twitter.com": "X / Twitter",
  "t.co": "X / Twitter",

  // YouTube
  youtube: "YouTube",
  yt: "YouTube",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",

  // Email
  email: "Email",
  newsletter: "Email",
  mailchimp: "Email",
  klaviyo: "Email",

  // Direct / QR
  direct: "Direct",
  "(none)": "Direct",
  qr: "QR Code",
  qr_code: "QR Code",

  // OTP Widget
  website_widget: "Website Widget",
  ourtownproperties: "Website Widget",

  // Search
  google: "Google",
  "google.com": "Google",
  "google-ads": "Google",
  bing: "Bing",
  "bing.com": "Bing",
};

const SOCIAL_PLATFORMS = new Set<TrafficPlatform>([
  "Facebook",
  "Instagram",
  "Threads",
  "LinkedIn",
  "X / Twitter",
  "YouTube",
]);

const DIRECT_PLATFORMS = new Set<TrafficPlatform>(["Direct", "QR Code"]);

const ORGANIC_PLATFORMS = new Set<TrafficPlatform>([
  "Google",
  "Bing",
  "Organic Search",
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function normalizePlatform(
  utmSource: string | null | undefined,
  referrerType: string | null | undefined
): TrafficPlatform {
  const raw = (utmSource ?? "").trim().toLowerCase();
  if (raw && SOURCE_TO_PLATFORM[raw]) {
    return SOURCE_TO_PLATFORM[raw];
  }

  // Fall back to referrer_type
  switch (referrerType) {
    case "social":
      return "Facebook"; // most common social for this market
    case "organic":
      return "Organic Search";
    case "paid":
      return "Google";
    case "email":
      return "Email";
    case "direct":
      return "Direct";
    case "referral":
      return "Referral";
    default:
      break;
  }

  if (!raw) return "Direct";
  return "Other";
}

export interface AttrInputRow {
  utm_source: string | null;
  utm_medium: string | null;
  referrer_type: string | null;
  is_paid: boolean | null;
}

export function buildSourceRollup(attrRows: AttrInputRow[]): SourceRollupSummary {
  const platformCounts = new Map<TrafficPlatform, number>();
  const rows: SourceRollupRow[] = [];

  const rawGroups = new Map<string, { count: number; isPaid: boolean; platform: TrafficPlatform }>();

  for (const row of attrRows) {
    const platform = normalizePlatform(row.utm_source, row.referrer_type);
    const isPaid = Boolean(row.is_paid) || (row.utm_medium ?? "").includes("paid");
    const key = `${platform}::${row.utm_source ?? ""}`;

    const existing = rawGroups.get(key);
    if (existing) {
      existing.count++;
    } else {
      rawGroups.set(key, { count: 1, isPaid, platform });
    }

    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }

  for (const [key, info] of rawGroups.entries()) {
    const rawSource = key.split("::")[1] || null;
    rows.push({ platform: info.platform, rawSource: rawSource || null, count: info.count, isPaid: info.isPaid });
  }

  rows.sort((a, b) => b.count - a.count);

  let organicCount = 0;
  let paidCount = 0;
  let socialCount = 0;
  let directCount = 0;
  let topPlatform: TrafficPlatform | null = null;
  let topCount = 0;

  const byPlatform = {} as Record<TrafficPlatform, number>;

  for (const [platform, count] of platformCounts.entries()) {
    byPlatform[platform] = count;
    if (SOCIAL_PLATFORMS.has(platform)) socialCount += count;
    if (DIRECT_PLATFORMS.has(platform)) directCount += count;
    if (ORGANIC_PLATFORMS.has(platform)) organicCount += count;
    if (rows.find((r) => r.platform === platform && r.isPaid)) paidCount += count;
    if (count > topCount) {
      topCount = count;
      topPlatform = platform;
    }
  }

  return {
    byPlatform,
    organicCount,
    paidCount,
    socialCount,
    directCount,
    topPlatform,
    rows,
  };
}
