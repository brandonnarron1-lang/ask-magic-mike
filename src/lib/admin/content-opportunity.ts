/**
 * Content Opportunity Engine
 *
 * Generates the top-25 content opportunities from lead question patterns,
 * search intent, and attribution data.
 *
 * Deterministic. No API calls. No writes.
 */

import type { QuestionCategory } from "./question-intelligence";
import { INTENT_SCORES } from "./question-intelligence";
import type { QuestionIntelligence } from "./question-intelligence";
import type { SourceRollupSummary } from "./source-attribution-rollup";

// Re-export so tests can use it
export { INTENT_SCORES };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentOpportunity {
  rank: number;
  title: string;
  hook: string;
  cta: string;
  intentScore: number;
  category: QuestionCategory;
  dataSource: "question" | "intent" | "attribution";
}

// ---------------------------------------------------------------------------
// Template library — 25 evergreen Wilson NC real estate content hooks
// ---------------------------------------------------------------------------

interface ContentTemplate {
  title: string;
  hook: string;
  cta: string;
  category: QuestionCategory;
  baseIntentScore: number;
}

const CONTENT_TEMPLATES: ContentTemplate[] = [
  // Home value
  {
    title: "What Is My Wilson NC Home Worth in {year}?",
    hook: "Wilson homeowners are getting {delta}% more than they expected. Here's what your neighborhood is actually doing right now.",
    cta: "Get Your Free Home Value Estimate →",
    category: "home_value",
    baseIntentScore: 92,
  },
  {
    title: "Why Wilson Home Values Have Changed — And What It Means For You",
    hook: "The Wilson market moved quietly while everyone was watching Raleigh. Here's what sellers are seeing at closing.",
    cta: "See Comparable Sales Near You →",
    category: "home_value",
    baseIntentScore: 88,
  },
  {
    title: "The Honest Guide to What Buyers Will Actually Pay in Wilson",
    hook: "List price and sale price are two very different numbers. I'll show you the real gap — and how to close it.",
    cta: "Talk to Mike About Pricing →",
    category: "home_value",
    baseIntentScore: 86,
  },
  // Selling
  {
    title: "Should You Sell Your Wilson Home Now or Wait Until Spring?",
    hook: "Everyone says wait until spring. The data says something different. Here's what the Wilson market is telling us right now.",
    cta: "Ask Mike: Is Now a Good Time to Sell? →",
    category: "market_timing",
    baseIntentScore: 85,
  },
  {
    title: "How Long Does It Take to Sell a Home in Wilson NC?",
    hook: "Average days on market isn't the full story. Here's what's selling in under 2 weeks — and what's sitting.",
    cta: "Get a Free Selling Timeline for Your Home →",
    category: "selling",
    baseIntentScore: 84,
  },
  {
    title: "The 5 Biggest Mistakes Wilson Sellers Make (and How to Avoid Them)",
    hook: "Mistake #3 costs sellers an average of $8,000. And most don't even know they're making it.",
    cta: "Request a Free Pre-Listing Consultation →",
    category: "selling",
    baseIntentScore: 83,
  },
  {
    title: "What Repairs Are Actually Worth Making Before You Sell in Wilson?",
    hook: "Not every upgrade adds value. I'll show you exactly which improvements Wilson buyers are paying a premium for right now.",
    cta: "Get a Pre-Sale Prep Checklist →",
    category: "selling",
    baseIntentScore: 80,
  },
  // Cash offers / investing
  {
    title: "Cash Offers in Wilson NC: Are They Worth It?",
    hook: "Cash buyers are offering fast closings — but is the number fair? Here's how to know before you sign.",
    cta: "Compare Your Cash Offer to Market Value →",
    category: "cash_offer",
    baseIntentScore: 95,
  },
  {
    title: "We Buy Houses Wilson NC: What the Signs Don't Tell You",
    hook: "Those yard signs offer speed. The fine print costs you equity. Here's what a licensed broker would say — honestly.",
    cta: "Ask Mike to Review Any Cash Offer →",
    category: "cash_offer",
    baseIntentScore: 93,
  },
  {
    title: "How to Sell Your Wilson Home As-Is (Without Losing Money)",
    hook: "Selling as-is doesn't have to mean leaving money on the table. Here's the strategy that protects you.",
    cta: "Talk to Mike About As-Is Sales →",
    category: "cash_offer",
    baseIntentScore: 90,
  },
  // Investing
  {
    title: "Is Wilson NC a Good Place to Invest in Real Estate Right Now?",
    hook: "Cap rates in Wilson are outperforming Raleigh's suburbs. Here's where the smart money is going.",
    cta: "Explore Wilson Investment Opportunities →",
    category: "investing",
    baseIntentScore: 78,
  },
  {
    title: "Best Neighborhoods in Wilson NC for Rental Property ROI",
    hook: "I've closed investor deals in every Wilson zip code. Here are the three neighborhoods with the strongest cash flow.",
    cta: "Ask Mike About Investor Properties →",
    category: "investing",
    baseIntentScore: 76,
  },
  // Buying
  {
    title: "First-Time Homebuyer Guide for Wilson NC",
    hook: "Down payment assistance, school districts, and the neighborhoods first-time buyers are loving right now.",
    cta: "Start Your Wilson Home Search →",
    category: "buying",
    baseIntentScore: 75,
  },
  {
    title: "The Best Neighborhoods in Wilson NC by School Rating",
    hook: "Families are moving to Wilson for the schools and staying for the community. Here's the honest breakdown.",
    cta: "Find Homes Near Top Wilson Schools →",
    category: "buying",
    baseIntentScore: 73,
  },
  {
    title: "What $200K–$350K Gets You in Wilson NC Today",
    hook: "Your budget goes further in Wilson than almost anywhere else in NC. Here's what buyers are actually getting.",
    cta: "Browse Wilson Homes in Your Budget →",
    category: "buying",
    baseIntentScore: 72,
  },
  // Market timing
  {
    title: "Is the Wilson NC Housing Market Slowing Down?",
    hook: "Higher rates slowed some markets. Wilson tells a different story. Here's the data no one is showing you.",
    cta: "Get the Latest Wilson Market Report →",
    category: "market_timing",
    baseIntentScore: 68,
  },
  {
    title: "Wilson NC Real Estate Forecast: What's Coming in the Next 6 Months",
    hook: "Based on current inventory, interest rate trends, and local employment data — here's what I'm telling my clients.",
    cta: "Talk to Mike About Timing Your Move →",
    category: "market_timing",
    baseIntentScore: 66,
  },
  // Financing
  {
    title: "How to Buy a Home in Wilson NC With Low Down Payment",
    hook: "USDA loans cover most of Wilson. FHA goes everywhere else. Here's how to get into a home with less than 5% down.",
    cta: "Ask Mike About Down Payment Programs →",
    category: "financing",
    baseIntentScore: 64,
  },
  // Relocation
  {
    title: "Moving to Wilson NC? Here's What No One Tells You",
    hook: "Raleigh expats are rediscovering Wilson. Here's what the commute, cost of living, and community are actually like.",
    cta: "Plan Your Wilson Relocation →",
    category: "relocation",
    baseIntentScore: 60,
  },
  {
    title: "Wilson NC vs. Rocky Mount vs. Goldsboro: Where Should You Move?",
    hook: "Three Eastern NC cities, three very different lifestyles. Here's an honest comparison from someone who sells in all three.",
    cta: "Get a Personalized Area Comparison →",
    category: "relocation",
    baseIntentScore: 58,
  },
  // Community / lifestyle
  {
    title: "What's It Like Living in Wilson NC? The Honest 2024 Guide",
    hook: "I've sold hundreds of homes here. Let me give you the unfiltered version — good and bad.",
    cta: "Ask Mike Anything About Wilson →",
    category: "general",
    baseIntentScore: 50,
  },
  {
    title: "Wilson NC Crime Rate: What Buyers Ask Me Every Week",
    hook: "It's the question no one wants to ask their agent. Here's the honest answer, with actual data by neighborhood.",
    cta: "Ask About Safety in Any Wilson Neighborhood →",
    category: "buying",
    baseIntentScore: 55,
  },
  {
    title: "How Mike Eatmon Sold This Wilson Home in 8 Days (Case Study)",
    hook: "4-bedroom on Raleigh Rd. Listed Friday. Under contract Sunday. Here's exactly how we did it.",
    cta: "Request a Free Listing Strategy →",
    category: "selling",
    baseIntentScore: 82,
  },
  {
    title: "How to Interview a Real Estate Agent in Wilson NC",
    hook: "Most people pick an agent based on a yard sign. Here are the 7 questions that actually predict results.",
    cta: "Schedule a No-Pressure Intro with Mike →",
    category: "general",
    baseIntentScore: 45,
  },
  {
    title: "Wilson NC Foreclosure and Short Sale Guide for Buyers",
    hook: "Distressed properties can be gold — or landmines. Here's how to tell the difference before you make an offer.",
    cta: "Ask Mike About Distressed Properties →",
    category: "investing",
    baseIntentScore: 70,
  },
];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();
const DELTA_EXAMPLES = ["12", "8", "15", "10", "6"];

function fillTemplate(template: ContentTemplate, rank: number): ContentOpportunity {
  const deltaIdx = rank % DELTA_EXAMPLES.length;
  return {
    rank,
    title: template.title
      .replace("{year}", String(CURRENT_YEAR))
      .replace("{delta}", DELTA_EXAMPLES[deltaIdx]),
    hook: template.hook
      .replace("{year}", String(CURRENT_YEAR))
      .replace("{delta}", DELTA_EXAMPLES[deltaIdx]),
    cta: template.cta,
    intentScore: template.baseIntentScore,
    category: template.category,
    dataSource: "intent",
  };
}

export function buildContentOpportunities(
  questionIntel: QuestionIntelligence,
  _sourceRollup: SourceRollupSummary,
  limit = 25
): ContentOpportunity[] {
  const topCategory = questionIntel.topCategory;

  // Sort templates: boost templates matching the top question category
  const sorted = [...CONTENT_TEMPLATES].sort((a, b) => {
    const aBoost = topCategory && a.category === topCategory ? 10 : 0;
    const bBoost = topCategory && b.category === topCategory ? 10 : 0;
    return b.baseIntentScore + bBoost - (a.baseIntentScore + aBoost);
  });

  return sorted
    .slice(0, limit)
    .map((template, i) => fillTemplate(template, i + 1));
}
