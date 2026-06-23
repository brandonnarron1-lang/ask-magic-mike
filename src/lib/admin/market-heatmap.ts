/**
 * Local Market Heatmap
 *
 * Breaks down buyers / sellers / investors / cash buyers / home-value seekers
 * by attribution source. Derived from lead primary_intent, lead_type, and
 * source_attribution — no schema changes, no writes.
 */

import { normalizePlatform } from "./source-attribution-rollup";
import type { TrafficPlatform } from "./source-attribution-rollup";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarketSegment =
  | "buyers"
  | "sellers"
  | "investors"
  | "cash_buyers"
  | "home_value";

export interface HeatmapCell {
  platform: TrafficPlatform;
  segment: MarketSegment;
  count: number;
}

export interface MarketHeatmap {
  bySegment: Record<MarketSegment, number>;
  byPlatform: Record<string, Record<MarketSegment, number>>;
  cells: HeatmapCell[];
  topSegment: MarketSegment | null;
  topPlatformForSegment: Record<MarketSegment, TrafficPlatform | null>;
}

// ---------------------------------------------------------------------------
// Segment detection
// ---------------------------------------------------------------------------

function detectSegment(
  primaryIntent: string | null,
  leadType: string | null,
  ctaChipUsed: string | null,
  questionRaw: string | null
): MarketSegment {
  const intent = (primaryIntent ?? "").toLowerCase();
  const type   = (leadType   ?? "").toLowerCase();
  const cta    = (ctaChipUsed ?? "").toLowerCase();
  const q      = (questionRaw ?? "").toLowerCase();

  if (
    type === "seller_cash_offer" ||
    cta === "should_sell_now" ||
    q.includes("cash offer") ||
    q.includes("cash buyer") ||
    q.includes("as-is") ||
    q.includes("we buy")
  ) {
    return "cash_buyers";
  }

  if (type === "investor" || q.includes("invest") || q.includes("rental") || q.includes("flip")) {
    return "investors";
  }

  if (
    type === "home_value" ||
    cta === "home_worth" ||
    q.includes("worth") ||
    q.includes("value") ||
    q.includes("appraisal")
  ) {
    return "home_value";
  }

  if (intent === "sell" || type === "seller" || cta === "should_sell_now") {
    return "sellers";
  }

  if (intent === "buy" || type === "buyer" || type === "listing_inquiry") {
    return "buyers";
  }

  // Default: lean buyer for "both" or unknown
  if (intent === "both") return "buyers";
  return "sellers";
}

// ---------------------------------------------------------------------------
// Input row shape (loose — avoids generated types dependency)
// ---------------------------------------------------------------------------

export interface HeatmapInputRow {
  primary_intent: string | null;
  lead_type: string | null;
  cta_chip_used: string | null;
  question_raw: string | null;
  utm_source: string | null;
  referrer_type: string | null;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const SEGMENTS: MarketSegment[] = [
  "buyers",
  "sellers",
  "investors",
  "cash_buyers",
  "home_value",
];

function emptySegmentMap(): Record<MarketSegment, number> {
  return { buyers: 0, sellers: 0, investors: 0, cash_buyers: 0, home_value: 0 };
}

export function buildMarketHeatmap(rows: HeatmapInputRow[]): MarketHeatmap {
  const bySegment = emptySegmentMap();
  const byPlatform: Record<string, Record<MarketSegment, number>> = {};
  const cellMap = new Map<string, number>();

  for (const row of rows) {
    const segment = detectSegment(
      row.primary_intent,
      row.lead_type,
      row.cta_chip_used,
      row.question_raw
    );
    const platform = normalizePlatform(row.utm_source, row.referrer_type);

    bySegment[segment]++;

    if (!byPlatform[platform]) byPlatform[platform] = emptySegmentMap();
    byPlatform[platform][segment]++;

    const key = `${platform}::${segment}`;
    cellMap.set(key, (cellMap.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = Array.from(cellMap.entries())
    .map(([key, count]) => {
      const [platform, segment] = key.split("::") as [TrafficPlatform, MarketSegment];
      return { platform, segment, count };
    })
    .sort((a, b) => b.count - a.count);

  let topSegment: MarketSegment | null = null;
  let topSegmentCount = 0;
  for (const seg of SEGMENTS) {
    if (bySegment[seg] > topSegmentCount) {
      topSegmentCount = bySegment[seg];
      topSegment = seg;
    }
  }

  const topPlatformForSegment: Record<MarketSegment, TrafficPlatform | null> = {
    buyers: null,
    sellers: null,
    investors: null,
    cash_buyers: null,
    home_value: null,
  };

  for (const seg of SEGMENTS) {
    let best: TrafficPlatform | null = null;
    let bestCount = 0;
    for (const [platform, segMap] of Object.entries(byPlatform)) {
      if ((segMap[seg] ?? 0) > bestCount) {
        bestCount = segMap[seg];
        best = platform as TrafficPlatform;
      }
    }
    topPlatformForSegment[seg] = best;
  }

  return { bySegment, byPlatform, cells, topSegment, topPlatformForSegment };
}
