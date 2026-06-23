/**
 * Question Intelligence
 *
 * Parses, categorises, and surfaces patterns in raw lead questions.
 * Purely deterministic — no API calls, no writes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionCategory =
  | "home_value"
  | "selling"
  | "buying"
  | "investing"
  | "cash_offer"
  | "relocation"
  | "market_timing"
  | "financing"
  | "general";

export interface QuestionRow {
  text: string;
  count: number;
  category: QuestionCategory;
  intent: "high" | "medium" | "low";
  source: string | null;
}

export interface QuestionIntelligence {
  topQuestions: QuestionRow[];
  categoryBreakdown: Record<QuestionCategory, number>;
  highIntentCount: number;
  totalQuestionsAnalyzed: number;
  topCategory: QuestionCategory | null;
}

// ---------------------------------------------------------------------------
// Keyword rules
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ category: QuestionCategory; keywords: string[] }> = [
  {
    category: "home_value",
    keywords: [
      "worth", "value", "price", "appraisal", "estimate", "valued",
      "how much", "market value", "home worth", "house worth", "what can i get",
      "sell for", "listing price",
    ],
  },
  {
    category: "selling",
    keywords: [
      "sell", "selling", "list", "listing", "should i sell", "when to sell",
      "ready to sell", "put on market", "move out", "moving out",
    ],
  },
  {
    category: "cash_offer",
    keywords: [
      "cash offer", "cash buyer", "we buy", "as-is", "as is", "quick sale",
      "fast sale", "sell fast", "sell quickly", "no repairs",
    ],
  },
  {
    category: "investing",
    keywords: [
      "invest", "investment", "rental", "landlord", "roi", "return",
      "flip", "flipping", "income property", "cap rate", "airbnb",
    ],
  },
  {
    category: "buying",
    keywords: [
      "buy", "buying", "looking for", "find a home", "first home",
      "first time buyer", "move to", "relocating to", "homes for sale",
      "neighborhood", "school district",
    ],
  },
  {
    category: "relocation",
    keywords: [
      "relocat", "moving to wilson", "moving to nc", "new to the area",
      "just moved", "transfer", "job transfer",
    ],
  },
  {
    category: "market_timing",
    keywords: [
      "right time", "good time", "market", "housing market", "interest rate",
      "rates", "bubble", "crash", "slow down", "hot market",
    ],
  },
  {
    category: "financing",
    keywords: [
      "mortgage", "loan", "down payment", "pre-approv", "pre approv",
      "qualify", "afford", "credit", "fha", "va loan", "usda",
    ],
  },
];

export const INTENT_SCORES: Record<QuestionCategory, number> = {
  cash_offer:    100,
  home_value:    90,
  selling:       85,
  buying:        75,
  investing:     70,
  market_timing: 55,
  financing:     60,
  relocation:    50,
  general:       35,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function categorizeQuestion(text: string): QuestionCategory {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return "general";
}

export function intentFromCategory(category: QuestionCategory): "high" | "medium" | "low" {
  const score = INTENT_SCORES[category];
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function normalizeQuestion(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 200);
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export interface QuestionInputRow {
  question_raw: string | null;
  utm_source?: string | null;
}

export function buildQuestionIntelligence(
  rows: QuestionInputRow[],
  limit = 10
): QuestionIntelligence {
  const categoryBreakdown: Record<QuestionCategory, number> = {
    home_value: 0,
    selling: 0,
    buying: 0,
    investing: 0,
    cash_offer: 0,
    relocation: 0,
    market_timing: 0,
    financing: 0,
    general: 0,
  };

  // Deduplicate and count questions
  const questionMap = new Map<
    string,
    { count: number; category: QuestionCategory; source: string | null }
  >();

  let totalQuestionsAnalyzed = 0;

  for (const row of rows) {
    if (!row.question_raw) continue;
    const text = normalizeQuestion(row.question_raw);
    if (!text) continue;

    totalQuestionsAnalyzed++;
    const category = categorizeQuestion(text);
    categoryBreakdown[category]++;

    const key = text.toLowerCase().slice(0, 80);
    const existing = questionMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      questionMap.set(key, {
        count: 1,
        category,
        source: row.utm_source ?? null,
      });
    }
  }

  const topQuestions: QuestionRow[] = Array.from(questionMap.entries())
    .map(([key, info]) => ({
      text: key.charAt(0).toUpperCase() + key.slice(1),
      count: info.count,
      category: info.category,
      intent: intentFromCategory(info.category),
      source: info.source,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return INTENT_SCORES[b.category] - INTENT_SCORES[a.category];
    })
    .slice(0, limit);

  const highIntentCount = Object.entries(categoryBreakdown)
    .filter(([cat]) => intentFromCategory(cat as QuestionCategory) === "high")
    .reduce((sum, [, count]) => sum + count, 0);

  let topCategory: QuestionCategory | null = null;
  let topCategoryCount = 0;
  for (const [cat, count] of Object.entries(categoryBreakdown)) {
    if (count > topCategoryCount) {
      topCategoryCount = count;
      topCategory = cat as QuestionCategory;
    }
  }

  return {
    topQuestions,
    categoryBreakdown,
    highIntentCount,
    totalQuestionsAnalyzed,
    topCategory,
  };
}
