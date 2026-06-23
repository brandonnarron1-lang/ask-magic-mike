/**
 * Tests for src/lib/admin/question-intelligence.ts
 */
import { describe, expect, it } from "vitest";
import {
  categorizeQuestion,
  intentFromCategory,
  buildQuestionIntelligence,
  INTENT_SCORES,
} from "@/lib/admin/question-intelligence";
import type { QuestionInputRow } from "@/lib/admin/question-intelligence";

// ---------------------------------------------------------------------------
// categorizeQuestion
// ---------------------------------------------------------------------------

describe("categorizeQuestion", () => {
  it("categorizes home value questions", () => {
    expect(categorizeQuestion("What is my home worth?")).toBe("home_value");
    expect(categorizeQuestion("Can you give me an appraisal estimate?")).toBe("home_value");
    expect(categorizeQuestion("How much can I sell for?")).toBe("home_value");
  });

  it("categorizes selling questions", () => {
    expect(categorizeQuestion("When should I sell my house?")).toBe("selling");
    // "on the market" → contains "market" triggering market_timing; use "listing" instead
    expect(categorizeQuestion("I want to list my home")).toBe("selling");
    expect(categorizeQuestion("ready to sell my property")).toBe("selling");
  });

  it("categorizes cash offer questions", () => {
    expect(categorizeQuestion("Do you know any cash buyers?")).toBe("cash_offer");
    // "I need to sell as-is" triggers "sell" → selling before "as-is" → cash_offer
    // Use a phrase that leads with a cash_offer-only keyword
    expect(categorizeQuestion("Looking for a quick sale")).toBe("cash_offer");
    expect(categorizeQuestion("No repairs needed — fast sale please")).toBe("cash_offer");
  });

  it("categorizes investing questions", () => {
    expect(categorizeQuestion("Is this a good rental property?")).toBe("investing");
    expect(categorizeQuestion("What's the ROI on flipping in Wilson?")).toBe("investing");
  });

  it("categorizes buying questions", () => {
    expect(categorizeQuestion("I want to buy a home in Wilson")).toBe("buying");
    expect(categorizeQuestion("Are there homes for sale near good school districts?")).toBe("buying");
  });

  it("categorizes relocation questions", () => {
    // "relocating to" is a buying keyword that fires before relocation rules
    // Use "just moved" or "new to the area" which only match relocation keywords
    expect(categorizeQuestion("Just moved to Wilson NC")).toBe("relocation");
    expect(categorizeQuestion("New to the area and need help with a job transfer")).toBe("relocation");
  });

  it("categorizes market timing questions", () => {
    expect(categorizeQuestion("Is this a good time with these interest rates?")).toBe("market_timing");
    expect(categorizeQuestion("Is the housing market slowing down?")).toBe("market_timing");
  });

  it("categorizes financing questions", () => {
    expect(categorizeQuestion("Can I get a mortgage with bad credit?")).toBe("financing");
    // "how much" → home_value fires first; use a phrase without "how much"
    expect(categorizeQuestion("What down payment do I need for an FHA loan?")).toBe("financing");
    expect(categorizeQuestion("Do you know about VA loan options?")).toBe("financing");
  });

  it("defaults to general for unrecognized text", () => {
    expect(categorizeQuestion("Hello I have a random question")).toBe("general");
    expect(categorizeQuestion("Tell me something interesting")).toBe("general");
  });

  it("is case-insensitive", () => {
    expect(categorizeQuestion("WHAT IS MY HOME WORTH")).toBe("home_value");
    expect(categorizeQuestion("SELL MY HOUSE")).toBe("selling");
  });

  it("correctly categorizes 'cash offer' keyword", () => {
    expect(categorizeQuestion("I received a cash offer")).toBe("cash_offer");
  });

  it("home_value fires before cash_offer when both could match", () => {
    // "what can I get for" triggers home_value before any cash_offer keyword
    expect(categorizeQuestion("what can i get for my property in cash?")).toBe("home_value");
  });

  it("selling fires before market_timing for 'sell' keyword", () => {
    // "sell" is in selling rules; "market" alone would hit market_timing but "sell" comes first
    expect(categorizeQuestion("should i sell now")).toBe("selling");
  });
});

// ---------------------------------------------------------------------------
// intentFromCategory
// ---------------------------------------------------------------------------

describe("intentFromCategory", () => {
  it("cash_offer → high (score 100)", () => {
    expect(intentFromCategory("cash_offer")).toBe("high");
  });

  it("home_value → high (score 90)", () => {
    expect(intentFromCategory("home_value")).toBe("high");
  });

  it("selling → high (score 85)", () => {
    expect(intentFromCategory("selling")).toBe("high");
  });

  it("buying → medium (score 75)", () => {
    expect(intentFromCategory("buying")).toBe("medium");
  });

  it("investing → medium (score 70)", () => {
    expect(intentFromCategory("investing")).toBe("medium");
  });

  it("financing → medium (score 60)", () => {
    expect(intentFromCategory("financing")).toBe("medium");
  });

  it("market_timing → medium (score 55)", () => {
    expect(intentFromCategory("market_timing")).toBe("medium");
  });

  it("relocation → low (score 50)", () => {
    expect(intentFromCategory("relocation")).toBe("low");
  });

  it("general → low (score 35)", () => {
    expect(intentFromCategory("general")).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// INTENT_SCORES export
// ---------------------------------------------------------------------------

describe("INTENT_SCORES", () => {
  it("exports all nine categories", () => {
    const keys = Object.keys(INTENT_SCORES);
    expect(keys).toHaveLength(9);
    expect(keys).toContain("cash_offer");
    expect(keys).toContain("general");
  });

  it("cash_offer has highest score", () => {
    const max = Math.max(...Object.values(INTENT_SCORES));
    expect(INTENT_SCORES["cash_offer"]).toBe(max);
  });

  it("general has lowest score", () => {
    const min = Math.min(...Object.values(INTENT_SCORES));
    expect(INTENT_SCORES["general"]).toBe(min);
  });
});

// ---------------------------------------------------------------------------
// buildQuestionIntelligence
// ---------------------------------------------------------------------------

function makeRows(questions: (string | null)[]): QuestionInputRow[] {
  return questions.map((q) => ({ question_raw: q, utm_source: null }));
}

describe("buildQuestionIntelligence", () => {
  it("returns empty result for no rows", () => {
    const r = buildQuestionIntelligence([]);
    expect(r.totalQuestionsAnalyzed).toBe(0);
    expect(r.topQuestions).toHaveLength(0);
    expect(r.topCategory).toBeNull();
    expect(r.highIntentCount).toBe(0);
  });

  it("skips null question_raw", () => {
    const r = buildQuestionIntelligence(makeRows([null, null, "What is my home worth?"]));
    expect(r.totalQuestionsAnalyzed).toBe(1);
  });

  it("counts category breakdown correctly", () => {
    const rows = makeRows([
      "What is my home worth?",
      "What is my house value?",
      "Should I sell now?",
    ]);
    const r = buildQuestionIntelligence(rows);
    expect(r.categoryBreakdown.home_value).toBe(2);
    expect(r.categoryBreakdown.selling).toBe(1);
  });

  it("deduplicates similar questions", () => {
    const rows = makeRows([
      "What is my home worth?",
      "What is my home worth?",
      "What is my home worth?",
    ]);
    const r = buildQuestionIntelligence(rows);
    // Same text → same key → count=3 but 1 unique entry
    expect(r.topQuestions).toHaveLength(1);
    expect(r.topQuestions[0].count).toBe(3);
  });

  it("sets topCategory to the category with most questions", () => {
    const rows = makeRows([
      "What is my home worth?",
      "How much is my house valued at?",
      "I need an appraisal estimate",
      "Should I sell now?",
    ]);
    const r = buildQuestionIntelligence(rows);
    expect(r.topCategory).toBe("home_value");
  });

  it("counts highIntentCount only for high-intent categories", () => {
    const rows = makeRows([
      "I received a cash offer",  // cash_offer = high
      "What is my home worth?",   // home_value = high
      "Should I sell?",           // selling = high
      "Tell me about Wilson",     // general = low
    ]);
    const r = buildQuestionIntelligence(rows);
    // cash_offer, home_value, selling are all high intent
    expect(r.highIntentCount).toBe(3);
  });

  it("respects the limit parameter", () => {
    const questions = Array.from({ length: 20 }, (_, i) => `Question about the home value ${i}`);
    const r = buildQuestionIntelligence(makeRows(questions), 5);
    expect(r.topQuestions.length).toBeLessThanOrEqual(5);
  });

  it("sorts top questions by count descending", () => {
    const rows = makeRows([
      "I received a cash offer",
      "I received a cash offer",
      "I received a cash offer",
      "What is my home worth?",
      "What is my home worth?",
      "Should I sell now?",
    ]);
    const r = buildQuestionIntelligence(rows);
    expect(r.topQuestions[0].count).toBeGreaterThanOrEqual(r.topQuestions[1].count);
  });

  it("stores utm_source on the first occurrence of a question", () => {
    const rows = [
      { question_raw: "What is my home worth?", utm_source: "facebook" },
    ];
    const r = buildQuestionIntelligence(rows);
    expect(r.topQuestions[0].source).toBe("facebook");
  });

  it("attaches correct intent level to top questions", () => {
    const rows = makeRows(["I received a cash offer"]);
    const r = buildQuestionIntelligence(rows);
    expect(r.topQuestions[0].intent).toBe("high");
  });
});
