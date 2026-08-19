export const REVIEW_PLAN_VERSION = 1 as const;
export const REVIEW_PLAN_STORAGE_KEY = "amm:review-plan:v1";
export const REVIEW_PLAN_FRESH_DAYS = 30;

export const REVIEW_GOALS = ["seller", "buyer", "homeowner", "relocation"] as const;
export type ReviewGoal = (typeof REVIEW_GOALS)[number];

export const REVIEW_HORIZONS = ["30_days", "90_days", "6_months", "exploring"] as const;
export type ReviewHorizon = (typeof REVIEW_HORIZONS)[number];

export const REVIEW_FOCUSES = ["clarity", "preparation", "timing", "local_context"] as const;
export type ReviewFocus = (typeof REVIEW_FOCUSES)[number];

export type ReviewPlanPhase = "now" | "prepare" | "decide";

export interface ReviewPlanTask {
  id: string;
  phase: ReviewPlanPhase;
  title: string;
  description: string;
  why: string;
  focus: ReviewFocus[];
}

export interface ReviewPlanState {
  version: typeof REVIEW_PLAN_VERSION;
  goal: ReviewGoal;
  horizon: ReviewHorizon;
  focus: ReviewFocus;
  completedTaskIds: string[];
  generatedAt: string;
  updatedAt: string;
}

export interface ReviewPlanDefinition {
  goal: ReviewGoal;
  label: string;
  headline: string;
  summary: string;
  handoffLabel: string;
  handoffHref: string;
  tasks: ReviewPlanTask[];
}

export const GOAL_OPTIONS: Array<{
  key: ReviewGoal;
  label: string;
  description: string;
  marker: string;
}> = [
  { key: "seller", label: "Selling plan", description: "Prepare the facts, timing, and decisions for a human-reviewed selling conversation.", marker: "01" },
  { key: "buyer", label: "Buying plan", description: "Turn a broad search into clear priorities and property-verification steps.", marker: "02" },
  { key: "homeowner", label: "Annual home review", description: "Keep property records, changes, questions, and future plans organized.", marker: "03" },
  { key: "relocation", label: "Relocation plan", description: "Organize practical move logistics without neighborhood rankings or steering.", marker: "04" },
];

export const HORIZON_OPTIONS: Array<{ key: ReviewHorizon; label: string; description: string }> = [
  { key: "30_days", label: "Within 30 days", description: "Prioritize the facts and decisions that unblock a near-term move." },
  { key: "90_days", label: "Within 90 days", description: "Build a practical preparation and professional-review sequence." },
  { key: "6_months", label: "Within 6 months", description: "Create an organized runway without assuming your plans are final." },
  { key: "exploring", label: "Still exploring", description: "Start with clarity and preserve flexibility while facts are gathered." },
];

export const FOCUS_OPTIONS: Array<{ key: ReviewFocus; label: string; description: string }> = [
  { key: "clarity", label: "Decision clarity", description: "Know what must be verified before choosing a path." },
  { key: "preparation", label: "Preparation", description: "Organize records, questions, and practical next steps." },
  { key: "timing", label: "Timing", description: "Sequence decisions around the horizon you selected." },
  { key: "local_context", label: "Local context", description: "Prepare objective questions for a Wilson-area professional review." },
];

const COMMON_FINAL_TASK: ReviewPlanTask = {
  id: "human-review",
  phase: "decide",
  title: "Choose the facts for a local professional to verify",
  description: "Bring the short list of unresolved property, timing, availability, or process questions to a licensed professional before acting.",
  why: "Property-specific guidance, availability, pricing, agency, legal, lending, and financial questions require direct verification.",
  focus: ["clarity", "local_context"],
};

const TASKS: Record<ReviewGoal, ReviewPlanTask[]> = {
  seller: [
    { id: "seller-outcome", phase: "now", title: "Write the outcome that matters most", description: "Choose the primary decision driver: timing, preparation, convenience, a market conversation, or another practical concern.", why: "A clear objective keeps the review focused without assuming a selling path.", focus: ["clarity", "timing"] },
    { id: "seller-condition", phase: "now", title: "Create a factual condition snapshot", description: "List known updates, deferred maintenance, occupancy, and access considerations. Separate observations from estimates.", why: "A factual snapshot helps a professional ask better questions without creating a valuation or offer.", focus: ["preparation", "clarity"] },
    { id: "seller-records", phase: "prepare", title: "Gather the records you already control", description: "Collect permitted property records, improvement notes, warranties, and questions. Do not upload sensitive documents to this planner.", why: "Organized records reduce repeated fact-finding while keeping private documents off this device-only plan.", focus: ["preparation"] },
    { id: "seller-paths", phase: "prepare", title: "List the paths that need comparison", description: "Note which paths deserve a human discussion, such as preparation before listing or an as-is conversation. Do not assume either is appropriate.", why: "Comparing questions is useful; choosing a path requires property and market review.", focus: ["clarity", "local_context"] },
    { id: "seller-timeline", phase: "decide", title: "Map decisions to your timing window", description: "Identify which choices are reversible now and which should wait for verified property and market context.", why: "A sequence prevents urgency from turning an unverified assumption into a commitment.", focus: ["timing"] },
    COMMON_FINAL_TASK,
  ],
  buyer: [
    { id: "buyer-needs", phase: "now", title: "Separate needs from preferences", description: "Write a short list of practical requirements, flexible preferences, and deal-breakers you chose for yourself.", why: "Explicit priorities make later property comparisons explainable and reduce noise.", focus: ["clarity", "preparation"] },
    { id: "buyer-area", phase: "now", title: "Define objective search geography", description: "Choose cities, ZIP codes, travel constraints, or specific destinations that matter to you. Do not rank communities by demographics or protected traits.", why: "Objective, consumer-selected geography supports a useful search without steering.", focus: ["local_context", "clarity"] },
    { id: "buyer-financing", phase: "prepare", title: "Identify the financing facts to confirm", description: "List questions for an appropriately licensed lender or adviser. This planner does not calculate affordability or give lending advice.", why: "Verified financing context prevents a property search from relying on invented purchasing power.", focus: ["preparation", "clarity"] },
    { id: "buyer-compare", phase: "prepare", title: "Use one consistent comparison card", description: "Compare only verified public property facts, your own priorities, and questions that remain unanswered.", why: "A consistent method limits impulse decisions and hidden assumptions.", focus: ["preparation"] },
    { id: "buyer-timing", phase: "decide", title: "Set the next decision checkpoint", description: "Choose when to refresh priorities, financing context, and current availability before scheduling tours or making decisions.", why: "Search conditions and personal plans change; a checkpoint keeps the plan current.", focus: ["timing"] },
    COMMON_FINAL_TASK,
  ],
  homeowner: [
    { id: "owner-changes", phase: "now", title: "Record meaningful property changes", description: "Note completed improvements, major maintenance, occupancy changes, and questions. Keep sensitive documents outside this planner.", why: "A current factual record makes an annual conversation more useful without estimating value.", focus: ["preparation", "clarity"] },
    { id: "owner-records", phase: "now", title: "Review public-record questions", description: "Identify property-record facts you want a qualified source to confirm. A public record can be incomplete and is not a survey or valuation.", why: "Separating records from conclusions prevents false certainty.", focus: ["clarity", "local_context"] },
    { id: "owner-maintenance", phase: "prepare", title: "Create a practical maintenance discussion list", description: "List condition observations and professional questions. Do not treat this planner as an inspection, engineering opinion, or repair prescription.", why: "A discussion list helps you seek the right qualified advice without overclaiming expertise.", focus: ["preparation"] },
    { id: "owner-plans", phase: "prepare", title: "Refresh your next-year housing plans", description: "Decide whether you are staying, exploring a move, or simply keeping records current. No choice is inferred from your activity.", why: "An annual check-in should capture stated intent rather than predict it.", focus: ["timing", "clarity"] },
    { id: "owner-review", phase: "decide", title: "Prepare an annual real-estate review agenda", description: "Bring your property changes, timeline, and market questions to a licensed professional for current local context.", why: "Human review can connect current questions to verified facts without presenting an automated appraisal.", focus: ["local_context", "timing"] },
    COMMON_FINAL_TASK,
  ],
  relocation: [
    { id: "relocation-decision", phase: "now", title: "Define the move decision", description: "Write the practical reason, target timing, and decisions that must be made before the move becomes actionable.", why: "Clear stated needs are more reliable than assumptions about why or where someone should move.", focus: ["clarity", "timing"] },
    { id: "relocation-logistics", phase: "now", title: "List your objective logistics", description: "Record consumer-selected destinations, travel constraints, accessibility needs, and service-area questions without demographic rankings.", why: "Objective criteria support planning while avoiding steering or protected-class proxies.", focus: ["local_context", "preparation"] },
    { id: "relocation-housing", phase: "prepare", title: "Separate housing requirements from open questions", description: "List property type, timing, and practical requirements, then mark every availability or property fact that needs verification.", why: "A useful plan distinguishes preferences from facts that can change.", focus: ["preparation", "clarity"] },
    { id: "relocation-visit", phase: "prepare", title: "Build a verification visit agenda", description: "Plan questions for properties, routes, services, and professionals you choose. Do not use this planner for neighborhood quality rankings.", why: "A structured visit supports informed decisions without substituting subjective recommendations.", focus: ["local_context", "preparation"] },
    { id: "relocation-checkpoint", phase: "decide", title: "Set a relocation decision checkpoint", description: "Choose when to refresh timing, availability, and the open-question list before committing to travel or housing decisions.", why: "A checkpoint keeps changing facts from silently becoming stale assumptions.", focus: ["timing"] },
    COMMON_FINAL_TASK,
  ],
};

const HORIZON_TASKS: Record<ReviewHorizon, ReviewPlanTask> = {
  "30_days": { id: "horizon-30", phase: "now", title: "Protect the next 30 days", description: "Mark the two decisions that need verified facts first and postpone irreversible commitments until those facts are confirmed.", why: "Near-term timing benefits from a narrow, evidence-first sequence.", focus: ["timing", "clarity"] },
  "90_days": { id: "horizon-90", phase: "prepare", title: "Build a 90-day review rhythm", description: "Schedule one fact-gathering checkpoint, one professional-review checkpoint, and one decision checkpoint.", why: "A simple cadence keeps preparation moving without creating automated outreach.", focus: ["timing", "preparation"] },
  "6_months": { id: "horizon-180", phase: "prepare", title: "Create a six-month refresh point", description: "Choose which records, priorities, and local questions should be refreshed before your plan becomes near term.", why: "Longer horizons need freshness controls because personal and market facts can change.", focus: ["timing", "clarity"] },
  exploring: { id: "horizon-explore", phase: "now", title: "Keep exploration reversible", description: "Identify one low-risk fact to verify and one question to save for later. Do not treat exploration as a commitment.", why: "Small, reversible steps preserve flexibility while building useful context.", focus: ["clarity"] },
};

const GOAL_COPY: Record<ReviewGoal, Omit<ReviewPlanDefinition, "goal" | "tasks">> = {
  seller: { label: "Seller review plan", headline: "Prepare the decision before the property conversation.", summary: "A factual, reversible sequence for organizing selling questions without generating a valuation, offer, or promised outcome.", handoffLabel: "Request a local home review", handoffHref: "/home-value?utm_source=askmagicmike&utm_medium=owned_tool&utm_campaign=review_planner&utm_content=seller_plan" },
  buyer: { label: "Buyer review plan", headline: "Turn a broad search into a verifiable decision path.", summary: "A practical way to organize stated priorities, current questions, and checkpoints without claiming inventory or purchasing power.", handoffLabel: "Request a buyer plan", handoffHref: "/buy?utm_source=askmagicmike&utm_medium=owned_tool&utm_campaign=review_planner&utm_content=buyer_plan" },
  homeowner: { label: "Annual home review", headline: "Keep your property story current without an automated estimate.", summary: "A device-private annual review of property changes, records, plans, and questions for a licensed local professional.", handoffLabel: "Request a broker-reviewed conversation", handoffHref: "/home-value?utm_source=askmagicmike&utm_medium=owned_tool&utm_campaign=review_planner&utm_content=annual_review" },
  relocation: { label: "Relocation review plan", headline: "Organize the move around your own objective criteria.", summary: "A practical logistics and verification plan that avoids neighborhood rankings, demographic assumptions, and unverified availability.", handoffLabel: "Ask Mike about relocation", handoffHref: "/ask?utm_source=askmagicmike&utm_medium=owned_tool&utm_campaign=review_planner&utm_content=relocation_plan" },
};

function focusRank(task: ReviewPlanTask, focus: ReviewFocus) {
  return task.focus.includes(focus) ? 0 : 1;
}

export function buildReviewPlan(goal: ReviewGoal, horizon: ReviewHorizon, focus: ReviewFocus): ReviewPlanDefinition {
  const tasks = [HORIZON_TASKS[horizon], ...TASKS[goal]]
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const phaseOrder = { now: 0, prepare: 1, decide: 2 };
      return phaseOrder[left.task.phase] - phaseOrder[right.task.phase]
        || focusRank(left.task, focus) - focusRank(right.task, focus)
        || left.index - right.index;
    })
    .map(({ task }) => task);
  return { goal, ...GOAL_COPY[goal], tasks };
}

export function createReviewPlanState(goal: ReviewGoal, horizon: ReviewHorizon, focus: ReviewFocus, now = new Date()): ReviewPlanState {
  const timestamp = now.toISOString();
  return { version: REVIEW_PLAN_VERSION, goal, horizon, focus, completedTaskIds: [], generatedAt: timestamp, updatedAt: timestamp };
}

export function parseStoredReviewPlan(value: string | null): ReviewPlanState | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<ReviewPlanState>;
    if (candidate.version !== REVIEW_PLAN_VERSION) return null;
    if (!REVIEW_GOALS.includes(candidate.goal as ReviewGoal)) return null;
    if (!REVIEW_HORIZONS.includes(candidate.horizon as ReviewHorizon)) return null;
    if (!REVIEW_FOCUSES.includes(candidate.focus as ReviewFocus)) return null;
    if (!Array.isArray(candidate.completedTaskIds) || !candidate.completedTaskIds.every((id) => typeof id === "string" && id.length <= 80)) return null;
    const generatedAt = typeof candidate.generatedAt === "string" && Number.isFinite(Date.parse(candidate.generatedAt)) ? candidate.generatedAt : null;
    const updatedAt = typeof candidate.updatedAt === "string" && Number.isFinite(Date.parse(candidate.updatedAt)) ? candidate.updatedAt : null;
    if (!generatedAt || !updatedAt) return null;
    const validIds = new Set(buildReviewPlan(candidate.goal as ReviewGoal, candidate.horizon as ReviewHorizon, candidate.focus as ReviewFocus).tasks.map((task) => task.id));
    return {
      version: REVIEW_PLAN_VERSION,
      goal: candidate.goal as ReviewGoal,
      horizon: candidate.horizon as ReviewHorizon,
      focus: candidate.focus as ReviewFocus,
      completedTaskIds: [...new Set(candidate.completedTaskIds.filter((id) => validIds.has(id)))],
      generatedAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function reviewPlanFreshness(state: ReviewPlanState, now = new Date()) {
  const ageDays = Math.max(0, Math.floor((now.getTime() - Date.parse(state.updatedAt)) / 86_400_000));
  return { ageDays, stale: ageDays >= REVIEW_PLAN_FRESH_DAYS };
}
