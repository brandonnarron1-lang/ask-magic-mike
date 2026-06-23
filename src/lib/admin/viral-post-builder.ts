/**
 * Viral Post Builder
 *
 * Generates platform-specific social post copy from actual lead questions.
 * Template-based. Deterministic. No external API calls. No writes.
 *
 * Usage: copy the generated post into the native social platform editor.
 */

import type { QuestionCategory } from "./question-intelligence";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SocialPlatform = "facebook" | "linkedin" | "threads" | "x";

export interface SocialPost {
  platform: SocialPlatform;
  body: string;
  hashtags: string[];
  characterCount: number;
  sourceQuestion: string | null;
  category: QuestionCategory | null;
}

export interface ViralPostSet {
  facebook: SocialPost;
  linkedin: SocialPost;
  threads: SocialPost;
  x: SocialPost;
  generatedFromQuestion: string | null;
}

// ---------------------------------------------------------------------------
// Platform character limits
// ---------------------------------------------------------------------------

const CHAR_LIMITS: Record<SocialPlatform, number> = {
  facebook: 63206,
  linkedin: 3000,
  threads: 500,
  x: 280,
};

// ---------------------------------------------------------------------------
// Hashtag library by category
// ---------------------------------------------------------------------------

const CATEGORY_HASHTAGS: Record<QuestionCategory, string[]> = {
  home_value:    ["#WilsonNC", "#HomeValue", "#RealEstate", "#NCRealEstate", "#AskMike"],
  selling:       ["#WilsonNC", "#SellYourHome", "#NCRealEstate", "#HomeSelling", "#AskMike"],
  buying:        ["#WilsonNC", "#HomeBuying", "#NCRealEstate", "#FirstTimeHomebuyer", "#AskMike"],
  investing:     ["#WilsonNC", "#RealEstateInvesting", "#NCInvestor", "#CashFlow", "#AskMike"],
  cash_offer:    ["#WilsonNC", "#CashOffer", "#SellFast", "#NCRealEstate", "#AskMike"],
  relocation:    ["#WilsonNC", "#MovingToNC", "#EasternNC", "#Relocation", "#AskMike"],
  market_timing: ["#WilsonNC", "#HousingMarket", "#NCRealEstate", "#MarketUpdate", "#AskMike"],
  financing:     ["#WilsonNC", "#Mortgage", "#HomeLoans", "#FirstTimeHomebuyer", "#AskMike"],
  general:       ["#WilsonNC", "#RealEstate", "#NCRealEstate", "#OurTownProperties", "#AskMike"],
};

// ---------------------------------------------------------------------------
// Template functions per platform
// ---------------------------------------------------------------------------

function buildFacebook(question: string, category: QuestionCategory): string {
  return `Someone in Wilson asked me last week:

"${question}"

This is one of the most common questions I get — and the answer surprises most people.

The Wilson market right now is not what national headlines are saying. Local data tells a completely different story, and if you're making a real estate decision based on what you're seeing on the news, you may be leaving money on the table.

Here's what I tell every Wilson homeowner or buyer who asks me this:

The best move depends on YOUR situation — your timeline, your goals, and what your specific neighborhood is doing RIGHT NOW.

That's why I built Ask Magic Mike — so you can get a straight answer from a licensed Wilson broker, not an algorithm.

Drop your question in the comments, or tap the link to ask privately.

👇 askmagicmike.com/ask`;
}

function buildLinkedIn(question: string, category: QuestionCategory): string {
  return `A Wilson, NC homeowner asked me this week:

"${question}"

It's a great question — and one I hear constantly from people who are trying to make smart real estate decisions in a noisy market.

Here's my honest broker take:

The Wilson NC market is outperforming Eastern NC averages on several key metrics. But the answer to this specific question depends on factors most online tools simply can't account for: neighborhood absorption rates, local buyer demand, and the actual condition of comparable sales.

I've been selling real estate in Wilson for years. The patterns I'm seeing on the ground don't match what Zillow or national news is reporting.

If you're sitting on this question — or one like it — I'd rather you ask a licensed professional than guess.

That's the whole point of Ask Magic Mike: real answers from a real broker.

🔗 askmagicmike.com/ask

#WilsonNC #RealEstate #NCRealEstate #OurTownProperties`;
}

function buildThreads(question: string, category: QuestionCategory): string {
  // Threads: 500 chars
  const body = `Someone in Wilson asked: "${question.slice(0, 80)}${question.length > 80 ? "…" : ""}"

Real answer from a licensed Wilson broker — not an algorithm.

Ask Mike anything about Wilson NC real estate: askmagicmike.com/ask`;
  return body;
}

function buildX(question: string, category: QuestionCategory): string {
  // X: 280 chars — tight
  const shortQ = question.slice(0, 60) + (question.length > 60 ? "…" : "");
  return `"${shortQ}"

Real answer from a Wilson NC broker.
No algorithm. No spam.

askmagicmike.com/ask #WilsonNC #RealEstate`;
}

// ---------------------------------------------------------------------------
// Fallback question when no real question is available
// ---------------------------------------------------------------------------

const FALLBACK_QUESTIONS: Record<QuestionCategory, string> = {
  home_value:    "What is my Wilson NC home worth right now?",
  selling:       "Is now a good time to sell my home in Wilson?",
  buying:        "What are the best neighborhoods to buy in Wilson NC?",
  investing:     "Is Wilson NC a good market for rental property investment?",
  cash_offer:    "Should I take the cash offer on my Wilson NC home?",
  relocation:    "What is it like living in Wilson NC?",
  market_timing: "Is the Wilson NC housing market slowing down?",
  financing:     "How much do I need for a down payment in Wilson NC?",
  general:       "How do I find the right real estate agent in Wilson NC?",
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function makePost(
  platform: SocialPlatform,
  body: string,
  hashtags: string[],
  question: string | null,
  category: QuestionCategory | null
): SocialPost {
  return {
    platform,
    body,
    hashtags,
    characterCount: body.length,
    sourceQuestion: question,
    category,
  };
}

export function buildViralPostSet(
  topQuestion: string | null,
  category: QuestionCategory | null
): ViralPostSet {
  const cat: QuestionCategory = category ?? "general";
  const question = topQuestion ?? FALLBACK_QUESTIONS[cat];
  const tags = CATEGORY_HASHTAGS[cat];

  const fbBody = buildFacebook(question, cat);
  const liBody = buildLinkedIn(question, cat);
  const thBody = buildThreads(question, cat);
  const xBody  = buildX(question, cat);

  return {
    facebook: makePost("facebook", fbBody, tags, question, cat),
    linkedin: makePost("linkedin", liBody, tags, question, cat),
    threads:  makePost("threads",  thBody, tags, question, cat),
    x:        makePost("x",        xBody,  tags, question, cat),
    generatedFromQuestion: question,
  };
}
