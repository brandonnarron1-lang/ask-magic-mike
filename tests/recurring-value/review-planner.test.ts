import { describe, expect, it } from "vitest";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  HORIZON_OPTIONS,
  REVIEW_PLAN_FRESH_DAYS,
  REVIEW_PLAN_VERSION,
  buildReviewPlan,
  createReviewPlanState,
  parseStoredReviewPlan,
  reviewPlanFreshness,
} from "../../app/lib/reviewPlanner";

describe("device-private recurring-value review planner", () => {
  it("builds a deterministic plan with unique tasks for every allowed selection", () => {
    for (const goal of GOAL_OPTIONS) {
      for (const horizon of HORIZON_OPTIONS) {
        for (const focus of FOCUS_OPTIONS) {
          const first = buildReviewPlan(goal.key, horizon.key, focus.key);
          const second = buildReviewPlan(goal.key, horizon.key, focus.key);
          expect(second).toEqual(first);
          expect(first.tasks.length).toBeGreaterThanOrEqual(7);
          expect(new Set(first.tasks.map((task) => task.id)).size).toBe(first.tasks.length);
          expect(first.tasks.some((task) => task.id === "human-review")).toBe(true);
          expect(first.handoffHref).toMatch(/^\/(home-value|buy|ask)\?/);
          expect(first.handoffHref).toContain("utm_campaign=review_planner");
        }
      }
    }
  });

  it("stores only controlled enums, timestamps, and valid task identifiers", () => {
    const state = createReviewPlanState("seller", "90_days", "clarity", new Date("2026-08-19T12:00:00.000Z"));
    const parsed = parseStoredReviewPlan(JSON.stringify({
      ...state,
      completedTaskIds: ["seller-outcome", "not-a-real-task", "seller-outcome"],
      name: "Private Person",
      email: "private@example.com",
      phone: "2525550100",
      address: "123 Private Street",
      notes: "free text must not survive",
    }));

    expect(parsed).toEqual({
      ...state,
      completedTaskIds: ["seller-outcome"],
    });
    expect(Object.keys(parsed ?? {}).sort()).toEqual([
      "completedTaskIds",
      "focus",
      "generatedAt",
      "goal",
      "horizon",
      "updatedAt",
      "version",
    ]);
  });

  it("fails closed for malformed, unknown, or obsolete device state", () => {
    expect(parseStoredReviewPlan(null)).toBeNull();
    expect(parseStoredReviewPlan("not json")).toBeNull();
    expect(parseStoredReviewPlan(JSON.stringify({ version: REVIEW_PLAN_VERSION + 1 }))).toBeNull();
    expect(parseStoredReviewPlan(JSON.stringify({
      version: REVIEW_PLAN_VERSION,
      goal: "investor_profile",
      horizon: "90_days",
      focus: "clarity",
      completedTaskIds: [],
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))).toBeNull();
  });

  it("marks a plan stale only when the documented freshness window is reached", () => {
    const state = createReviewPlanState("homeowner", "6_months", "preparation", new Date("2026-01-01T00:00:00.000Z"));
    expect(reviewPlanFreshness(state, new Date("2026-01-30T23:59:59.000Z"))).toEqual({ ageDays: REVIEW_PLAN_FRESH_DAYS - 1, stale: false });
    expect(reviewPlanFreshness(state, new Date("2026-01-31T00:00:00.000Z"))).toEqual({ ageDays: REVIEW_PLAN_FRESH_DAYS, stale: true });
  });

  it("keeps guidance explainable and free of outcome, inventory, or steering claims", () => {
    const source = GOAL_OPTIONS.flatMap((goal) =>
      HORIZON_OPTIONS.flatMap((horizon) =>
        FOCUS_OPTIONS.flatMap((focus) => {
          const plan = buildReviewPlan(goal.key, horizon.key, focus.key);
          return [plan.headline, plan.summary, ...plan.tasks.flatMap((task) => [task.title, task.description, task.why])];
        }),
      ),
    ).join(" ").toLowerCase();

    for (const forbidden of [
      "guaranteed value",
      "guaranteed offer",
      "exact value",
      "instant valuation",
      "best neighborhood",
      "safe neighborhood",
      "good schools",
      "crime-free",
      "protected class",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain("licensed professional");
    expect(source).toContain("steering");
  });
});
