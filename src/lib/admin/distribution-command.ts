/**
 * Distribution Command Center
 *
 * Pure read-only module. No writes. No API calls. No outbound.
 *
 * Derives the publishing intelligence layer from existing TrafficCommandData:
 *   - What content opportunities exist
 *   - Which platforms show attribution traffic (inferred as "something was posted")
 *   - What traffic arrived and generated leads
 *   - What should be posted next
 *   - Stale platform/content detection
 *   - Weekly publishing plan
 *   - Executive summary
 *
 * "Published" platforms are INFERRED from source attribution — if a platform
 * has attribution traffic, a post exists there. This system does not maintain
 * an independent publishing log.
 */

import type { TrafficCommandData } from "./traffic-command";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DistributionStatus = "active" | "partial" | "empty";
export type PostStatus = "high_priority" | "ready" | "monitor";
export type PublishingDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface PublishingCounts {
  draftIdeas: number;
  readyToPublish: number;
  /** Inferred: platforms with attribution traffic > 0 */
  publishedPlatforms: number;
  needsRefresh: number;
}

export interface PlatformCoverageRow {
  platform: string;
  drafted: boolean;
  /** Has attribution traffic → inferred as "something posted here" */
  hasPublishedContent: boolean;
  traffic7d: number;
  leads30d: number;
  conversionPct: number | null;
  gap: boolean;
}

export interface QueuedPost {
  rank: number;
  title: string;
  hook: string;
  cta: string;
  category: string;
  intentScore: number;
  status: PostStatus;
  recommendedPlatform: string;
}

export interface PlatformAttribution {
  platform: string;
  traffic7d: number;
  leads30d: number;
  conversionPct: number | null;
}

export interface StaleItem {
  platform: string;
  reason: string;
  recommendation: string;
}

export interface DailyPost {
  day: PublishingDay;
  topic: string;
  platform: string;
  goal: string;
  intentScore: number;
}

export interface ExecutiveSummary {
  whatHappened: string;
  whatWorked: string | null;
  whatFailed: string | null;
  nextPost: string;
}

export interface DistributionCommandData {
  distributionHealth: DistributionStatus;
  publishingCounts: PublishingCounts;
  platformCoverageMatrix: PlatformCoverageRow[];
  priorityQueue: QueuedPost[];
  trafficByPlatform: PlatformAttribution[];
  stalePlatforms: StaleItem[];
  weeklyPublishingPlan: DailyPost[];
  nextPublishingActions: string[];
  executiveSummary: ExecutiveSummary;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Platform → recommended content category mapping
// ---------------------------------------------------------------------------

const PLATFORM_CONTENT_AFFINITY: Record<string, string[]> = {
  Facebook:   ["home_value", "selling", "cash_offer", "general"],
  Instagram:  ["home_value", "relocation", "buying", "general"],
  LinkedIn:   ["investing", "market_timing", "selling", "financing"],
  Threads:    ["market_timing", "buying", "general"],
  "X / Twitter": ["market_timing", "general", "cash_offer"],
  Email:      ["home_value", "selling", "financing"],
};

// The 6 human-operated posting platforms for coverage matrix
const TRACKED_PLATFORMS = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Threads",
  "X / Twitter",
  "Email",
] as const;

// ---------------------------------------------------------------------------
// Weekly plan template — day → platform + goal shape
// ---------------------------------------------------------------------------

const WEEKLY_TEMPLATE: Array<{ day: PublishingDay; platform: string; goal: string }> = [
  { day: "Monday",    platform: "Facebook",     goal: "Reach homeowners thinking about selling" },
  { day: "Tuesday",   platform: "Instagram",    goal: "Visual hook for first-time buyers and relocators" },
  { day: "Wednesday", platform: "LinkedIn",     goal: "Investor and professional audience" },
  { day: "Thursday",  platform: "Threads",      goal: "Conversational market insight — drive asks" },
  { day: "Friday",    platform: "X / Twitter",  goal: "Short viral take — drive link clicks" },
];

// Category → recommended platform (for queue)
const CATEGORY_TO_PLATFORM: Record<string, string> = {
  home_value:    "Facebook",
  selling:       "Facebook",
  cash_offer:    "Facebook",
  buying:        "Instagram",
  relocation:    "Instagram",
  investing:     "LinkedIn",
  market_timing: "Threads",
  financing:     "LinkedIn",
  general:       "Facebook",
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildDistributionCommand(
  trafficData: TrafficCommandData
): DistributionCommandData {
  const now = trafficData.generatedAt;
  const { sourceRollup, questionIntel, contentOpportunities, summary: s } = trafficData;

  // -------------------------------------------------------------------------
  // 1. Platform coverage — which platforms have attribution traffic?
  // -------------------------------------------------------------------------
  const attrByPlatform: Partial<Record<string, number>> = sourceRollup.byPlatform as Partial<Record<string, number>>;

  // We only have platform-level traffic from source attribution, not leads-by-platform.
  // Use the heatmap to infer per-platform lead proxies if available.
  const leadsByPlatform: Record<string, number> = {};
  for (const cell of trafficData.marketHeatmap.cells) {
    leadsByPlatform[cell.platform] = (leadsByPlatform[cell.platform] ?? 0) + cell.count;
  }

  const platformCoverageMatrix: PlatformCoverageRow[] = TRACKED_PLATFORMS.map((platform) => {
    const traffic7d = attrByPlatform[platform] ?? 0;
    const leads30d  = leadsByPlatform[platform] ?? 0;
    const hasPublishedContent = traffic7d > 0;
    const drafted = true; // All platforms have evergreen content templates available
    const conversionPct =
      traffic7d > 0 ? Math.round((leads30d / traffic7d) * 100) : null;
    const gap = !hasPublishedContent; // No traffic → gap

    return {
      platform,
      drafted,
      hasPublishedContent,
      traffic7d,
      leads30d,
      conversionPct,
      gap,
    };
  });

  // -------------------------------------------------------------------------
  // 2. Publishing counts
  // -------------------------------------------------------------------------
  const publishedPlatforms = platformCoverageMatrix.filter((r) => r.hasPublishedContent).length;
  const highIntentOpps = contentOpportunities.filter((o) => o.intentScore >= 80);
  const readyToPublish = Math.min(highIntentOpps.length, 25);
  const needsRefresh = platformCoverageMatrix.filter(
    (r) => r.hasPublishedContent && r.leads30d === 0
  ).length;

  const publishingCounts: PublishingCounts = {
    draftIdeas:         contentOpportunities.length,
    readyToPublish,
    publishedPlatforms,
    needsRefresh,
  };

  // -------------------------------------------------------------------------
  // 3. Distribution health
  // -------------------------------------------------------------------------
  let distributionHealth: DistributionStatus;
  if (publishedPlatforms >= 3) {
    distributionHealth = "active";
  } else if (publishedPlatforms >= 1) {
    distributionHealth = "partial";
  } else {
    distributionHealth = "empty";
  }

  // -------------------------------------------------------------------------
  // 4. Priority queue — top 25 content opportunities
  // -------------------------------------------------------------------------
  const priorityQueue: QueuedPost[] = contentOpportunities.slice(0, 25).map((opp, i) => {
    let status: PostStatus;
    if (opp.intentScore >= 85) {
      status = "high_priority";
    } else if (opp.intentScore >= 60) {
      status = "ready";
    } else {
      status = "monitor";
    }

    return {
      rank: i + 1,
      title: opp.title,
      hook: opp.hook,
      cta: opp.cta,
      category: opp.category,
      intentScore: opp.intentScore,
      status,
      recommendedPlatform: CATEGORY_TO_PLATFORM[opp.category] ?? "Facebook",
    };
  });

  // -------------------------------------------------------------------------
  // 5. Traffic → Lead attribution by platform
  // -------------------------------------------------------------------------
  const trafficByPlatform: PlatformAttribution[] = TRACKED_PLATFORMS
    .map((platform) => {
      const traffic7d = attrByPlatform[platform] ?? 0;
      const leads30d  = leadsByPlatform[platform] ?? 0;
      const conversionPct =
        traffic7d > 0 ? Math.round((leads30d / traffic7d) * 100) : null;
      return { platform, traffic7d, leads30d, conversionPct };
    })
    .filter((r) => r.traffic7d > 0 || r.leads30d > 0);

  // -------------------------------------------------------------------------
  // 6. Stale platform detection
  //    Stale = has traffic but 0 leads AND traffic > some threshold
  // -------------------------------------------------------------------------
  const stalePlatforms: StaleItem[] = platformCoverageMatrix
    .filter((r) => r.hasPublishedContent && r.leads30d === 0 && r.traffic7d >= 3)
    .map((r) => ({
      platform: r.platform,
      reason: `${r.traffic7d} sessions from ${r.platform} in 7d but 0 leads captured`,
      recommendation:
        "Refresh post title, add a direct question CTA, or try a different landing page (e.g. /value instead of /ask).",
    }));

  // -------------------------------------------------------------------------
  // 7. Weekly publishing plan
  // -------------------------------------------------------------------------
  // Map each day to the highest-intent content opportunity whose category
  // aligns with that day's platform affinity.
  const usedCategories = new Set<string>();

  const weeklyPublishingPlan: DailyPost[] = WEEKLY_TEMPLATE.map(({ day, platform, goal }) => {
    const affinityCategories = PLATFORM_CONTENT_AFFINITY[platform] ?? ["general"];

    // Find the best unused opportunity for this platform
    const candidate = contentOpportunities.find(
      (opp) =>
        affinityCategories.includes(opp.category) &&
        !usedCategories.has(opp.category)
    ) ?? contentOpportunities[0];

    if (candidate) usedCategories.add(candidate.category);

    return {
      day,
      platform,
      goal,
      topic: candidate?.title ?? `Post a Wilson NC real estate tip on ${platform}`,
      intentScore: candidate?.intentScore ?? 50,
    };
  });

  // -------------------------------------------------------------------------
  // 8. Next publishing actions
  // -------------------------------------------------------------------------
  const nextPublishingActions: string[] = [];

  if (distributionHealth === "empty") {
    nextPublishingActions.push(
      "No platform has attribution traffic yet. Post AMM links using the UTM Copy Bank in Traffic Command Center to start."
    );
  }

  const gapPlatforms = platformCoverageMatrix.filter((r) => r.gap).map((r) => r.platform);
  if (gapPlatforms.length > 0) {
    nextPublishingActions.push(
      `No traffic from: ${gapPlatforms.join(", ")}. Post content on these platforms to fill coverage gaps.`
    );
  }

  if (stalePlatforms.length > 0) {
    nextPublishingActions.push(
      `Stale platforms (traffic but 0 leads): ${stalePlatforms.map((p) => p.platform).join(", ")}. Refresh post CTA or landing page.`
    );
  }

  const topOpp = priorityQueue[0];
  if (topOpp) {
    nextPublishingActions.push(
      `Top content opportunity: "${topOpp.title}" (score ${topOpp.intentScore}) → recommend posting on ${topOpp.recommendedPlatform}.`
    );
  }

  if (questionIntel.topCategory) {
    nextPublishingActions.push(
      `Top question category this week: ${questionIntel.topCategory.replace("_", " ")}. Write content that directly answers this question.`
    );
  }

  if (nextPublishingActions.length === 0) {
    nextPublishingActions.push(
      "Distribution is active. Continue posting 1× per platform per week. Review Traffic Command Center for new question patterns."
    );
  }

  // -------------------------------------------------------------------------
  // 9. Executive summary
  // -------------------------------------------------------------------------
  const topPlatform = trafficByPlatform[0]?.platform ?? null;
  const topLeadPlatform = [...trafficByPlatform].sort((a, b) => b.leads30d - a.leads30d)[0]?.platform ?? null;

  const whatHappened =
    s.leads7d > 0
      ? `${s.leads7d} lead${s.leads7d === 1 ? "" : "s"} captured in 7 days. ${s.sessions7d} sessions recorded. Top source: ${topPlatform ?? "unattributed"}.`
      : "No leads or sessions recorded yet. Publish AMM links to start generating traffic.";

  const whatWorked =
    topLeadPlatform && trafficByPlatform.find((p) => p.platform === topLeadPlatform && p.leads30d > 0)
      ? `${topLeadPlatform} drove the most leads.`
      : null;

  const whatFailed =
    stalePlatforms.length > 0
      ? `${stalePlatforms.map((p) => p.platform).join(", ")} received traffic but generated 0 leads. CTA or landing page may need adjustment.`
      : null;

  const nextPost =
    priorityQueue[0]
      ? `"${priorityQueue[0].title}" on ${priorityQueue[0].recommendedPlatform} (intent score ${priorityQueue[0].intentScore})`
      : "Post a Wilson NC home value tip on Facebook";

  return {
    distributionHealth,
    publishingCounts,
    platformCoverageMatrix,
    priorityQueue,
    trafficByPlatform,
    stalePlatforms,
    weeklyPublishingPlan,
    nextPublishingActions,
    executiveSummary: { whatHappened, whatWorked, whatFailed, nextPost },
    generatedAt: now,
  };
}
