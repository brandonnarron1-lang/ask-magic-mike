import type {
  OrganicSearchImportRow,
  OrganicSearchOpportunityType,
} from "./organic-search-ingress";

export const ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION =
  "organic_search_experiment_brief_v1" as const;

export type OrganicSearchExperimentMetric =
  | "organic_ctr"
  | "organic_clicks"
  | "organic_impressions";

export interface OrganicSearchExperimentReference {
  label: string;
  href: string;
}

export interface OrganicSearchExperimentBrief {
  version: typeof ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION;
  key: string;
  status: "internal_review_only";
  pageUrl: string;
  pagePath: string;
  readerTask: string;
  opportunityType: OrganicSearchOpportunityType;
  opportunityScore: number;
  confidencePercent: number;
  evidence: {
    window: string;
    impressions: number;
    clicks: number;
    ctr: number;
    averagePosition: number;
    policyCtrThreshold: number;
    dataState: OrganicSearchImportRow["dataState"];
    device: OrganicSearchImportRow["device"];
    coverage: "operator_export_not_guaranteed_exhaustive";
  };
  objective: string;
  hypothesis: string;
  singleChangeScope: string;
  requiredInputs: readonly string[];
  reviewSteps: readonly string[];
  primaryMetric: {
    key: OrganicSearchExperimentMetric;
    label: string;
    baseline: string;
    decisionRule: string;
  };
  diagnosticMetrics: readonly string[];
  measurementPlan: readonly string[];
  guardrails: readonly string[];
  stopConditions: readonly string[];
  authority: string;
  limitations: readonly string[];
  references: readonly OrganicSearchExperimentReference[];
}

const OWNED_HOSTS = new Set([
  "askmagicmike.com",
  "www.askmagicmike.com",
  "ourtownproperties.com",
  "www.ourtownproperties.com",
]);

const OPPORTUNITY_TYPES = new Set<OrganicSearchOpportunityType>([
  "organic_click_capture_gap",
  "organic_page_one_gap",
  "organic_visibility_gap",
]);

const OFFICIAL_REFERENCES: readonly OrganicSearchExperimentReference[] = [
  {
    label: "Google · Helpful, reliable, people-first content",
    href: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
  },
  {
    label: "Google · Title links and snippets",
    href: "https://developers.google.com/search/docs/appearance/title-link",
  },
  {
    label: "Google · Search result snippets",
    href: "https://developers.google.com/search/docs/appearance/snippet",
  },
  {
    label: "Google · Search Console performance data limits",
    href: "https://support.google.com/webmasters/answer/17011259",
  },
];

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function integer(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function boundedMetric(value: number, minimum: number, maximum: number) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function ownedPage(row: OrganicSearchImportRow) {
  try {
    const url = new URL(row.pageUrl);
    return url.protocol === "https:" &&
      OWNED_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === row.pagePath;
  } catch {
    return false;
  }
}

function readerTask(pagePath: string) {
  if (/^\/(?:home-value|value)\/?$/.test(pagePath)) {
    return "Understand the broker-reviewed home-value and sale-readiness process and decide whether to request a review.";
  }
  if (/^\/sell\/?$/.test(pagePath)) {
    return "Understand the available human-reviewed selling paths and decide whether to request a conversation.";
  }
  if (/^\/buy\/?$/.test(pagePath)) {
    return "Understand the property-match and buying-plan process and decide whether to request help.";
  }
  if (/^\/(?:rent|renter|rentals)(?:\/|$)/.test(pagePath)) {
    return "Understand the rental-to-homeownership review and decide whether to request guidance.";
  }
  if (/^\/open-house(?:\/|$)/.test(pagePath)) {
    return "Review the approved public event context and decide whether to register or ask a question.";
  }
  if (/^\/ask\/?$/.test(pagePath)) {
    return "Ask a real-estate question and understand how a human-reviewed follow-up works.";
  }
  return "State the page's one primary consumer task before drafting; the page-level report does not reveal search-query intent.";
}

function experimentShape(
  type: OrganicSearchOpportunityType,
  row: OrganicSearchImportRow,
) {
  if (type === "organic_click_capture_gap") {
    return {
      objective: "Improve qualified click capture from existing organic visibility on this same canonical page.",
      hypothesis: "If the visible heading, opening answer, title, and page-specific description accurately align with one owner-verified consumer task, more relevant searchers may choose the result without reducing downstream lead quality.",
      singleChangeScope: "One answer-and-search-presentation alignment pass on the existing canonical page; do not create a duplicate route.",
      primaryMetric: {
        key: "organic_ctr" as const,
        label: "Organic click-through rate",
        baseline: percent(row.ctr),
        decisionRule: `Review whether CTR moves toward the internal ${percent(row.opportunity?.policyCtrThreshold ?? 0)} review threshold while qualified-lead quality and clicks do not regress. The threshold is a triage policy, not a Google benchmark or ranking promise.`,
      },
      focusStep: "Draft one descriptive, non-exaggerated title/heading alignment and one page-specific description that are both supported by the visible page.",
    };
  }
  if (type === "organic_page_one_gap") {
    return {
      objective: "Improve useful discovery and qualified clicks for an already-visible owned page.",
      hypothesis: "If the page gives a more complete owner-verified answer to its primary consumer task and receives relevant crawlable internal-link support, organic clicks may improve without manufacturing a new page or unsupported local claim.",
      singleChangeScope: "One people-first answer-depth and internal-link support pass on the existing canonical page; preserve its URL and primary conversion purpose.",
      primaryMetric: {
        key: "organic_clicks" as const,
        label: "Organic clicks",
        baseline: integer(row.clicks),
        decisionRule: "Look for a directional increase in clicks across a comparable observation window, supported by stable or improving CTR and qualified-lead quality. Do not describe average position as a guaranteed rank.",
      },
      focusStep: "Strengthen one incomplete answer section using owner-approved facts, then add only relevant crawlable links from existing owned pages after checking for duplication and cannibalization.",
    };
  }
  return {
    objective: "Test whether the existing page deserves broader useful discovery before considering any new page.",
    hypothesis: "If the page clearly fulfills one verified consumer task with original local expertise, accurate authorship, and relevant internal-link support, impressions and qualified visits may improve without mass-producing search-first content.",
    singleChangeScope: "One usefulness, authorship, and discoverability review on the existing canonical page; no programmatic page creation.",
    primaryMetric: {
      key: "organic_impressions" as const,
      label: "Organic impressions",
      baseline: integer(row.impressions),
      decisionRule: "Look for a directional increase in impressions across a comparable observation window while CTR, qualified-lead quality, and page experience remain healthy. Increased impressions alone are not a business outcome.",
    },
    focusStep: "Clarify the page's primary task, add only owner-verified useful information, identify the human reviewer, and confirm relevant crawlable internal links before changing search presentation.",
  };
}

export function buildOrganicSearchExperimentBrief(
  row: OrganicSearchImportRow,
): OrganicSearchExperimentBrief | null {
  const opportunity = row.opportunity;
  if (!opportunity || !OPPORTUNITY_TYPES.has(opportunity.type)) return null;
  if (!ownedPage(row) || !/^[0-9a-f]{64}$/.test(row.rowFingerprint)) return null;
  if (!validDate(row.startDate) || !validDate(row.endDate) || row.startDate > row.endDate) return null;
  if (
    !boundedMetric(row.impressions, 0, 10_000_000_000) ||
    !Number.isInteger(row.impressions) ||
    !boundedMetric(row.clicks, 0, row.impressions) ||
    !Number.isInteger(row.clicks) ||
    !boundedMetric(row.ctr, 0, 1) ||
    !boundedMetric(row.position, 1, 1_000) ||
    !boundedMetric(row.confidence, 0, 1) ||
    !boundedMetric(opportunity.score, 0, 100) ||
    !boundedMetric(opportunity.policyCtrThreshold, 0, 1)
  ) return null;

  const shape = experimentShape(opportunity.type, row);
  return {
    version: ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION,
    key: `${ORGANIC_SEARCH_EXPERIMENT_BRIEF_VERSION}:${row.rowFingerprint}`,
    status: "internal_review_only",
    pageUrl: row.pageUrl,
    pagePath: row.pagePath,
    readerTask: readerTask(row.pagePath),
    opportunityType: opportunity.type,
    opportunityScore: opportunity.score,
    confidencePercent: Math.round(row.confidence * 100),
    evidence: {
      window: `${row.startDate} to ${row.endDate}`,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      averagePosition: row.position,
      policyCtrThreshold: opportunity.policyCtrThreshold,
      dataState: row.dataState,
      device: row.device,
      coverage: "operator_export_not_guaranteed_exhaustive",
    },
    objective: shape.objective,
    hypothesis: shape.hypothesis,
    singleChangeScope: shape.singleChangeScope,
    requiredInputs: [
      "Current live title, visible H1, opening answer, page-specific description, canonical URL, and relevant internal links.",
      "One explicit consumer task confirmed by the owner or separately reviewed Search Console query evidence; query text is not retained in this system.",
      "Source-supported local facts and the named human author or brokerage reviewer responsible for accuracy.",
      "Current organic lead and qualified-appointment baseline for this page, excluding test and suppressed records.",
    ],
    reviewSteps: [
      "Inspect the live page before drafting; do not infer its current copy from this page-level metrics export.",
      "Confirm one people-first reader task and why this existing audience would find the answer useful without Search traffic.",
      shape.focusStep,
      "Keep the indexed URL and primary lead path stable unless a separate redirect/canonical review explicitly approves a change.",
      "Have Mike or the approved brokerage reviewer verify every local, property, service, availability, process, and timing statement before publication.",
      "Run accessibility, mobile, structured-data, analytics, canonical, and conversion checks in Preview before requesting publication approval.",
    ],
    primaryMetric: shape.primaryMetric,
    diagnosticMetrics: [
      "Search Console impressions, clicks, CTR, and average position for this canonical page",
      "Organic durable-lead and qualified-appointment rate, with test and suppressed records excluded",
      "Mobile page experience, accessibility, form completion, and canonical/analytics health",
    ],
    measurementPlan: [
      `Preserve this ${row.startDate} to ${row.endDate} report as the directional baseline; it may be truncated and is not causal proof.`,
      "After an approved substantive change is published and Google has recrawled the page, compare a complete 28-day window with a seasonally reasonable prior window.",
      "Extend observation when the comparison window has fewer than 100 impressions; do not declare a winner from a tiny sample.",
      "Record the exact change, publication proof, observation windows, lead-quality result, guardrails, and keep/iterate/revert decision in the controlled experiment ledger.",
    ],
    guardrails: [
      "No invented property, market, inventory, valuation, offer, availability, response-time, or performance claim.",
      "No protected-class data, proxies, steering language, neighborhood quality claim, or discriminatory targeting.",
      "No search-ranking guarantee, keyword stuffing, scaled duplicate page, date manipulation, hidden content, or search-engine-first filler.",
      "No raw query, consumer PII, credentials, private MLS remarks, or confidential provider data in the brief or public page.",
      "No weakening of consent, attribution, durable lead storage, accessibility, mobile usability, or page performance.",
    ],
    stopConditions: [
      "Stop before publication if the owner cannot verify the reader task, factual sources, author/reviewer, or one-variable change.",
      "Revert or pause if qualified-lead quality, accessibility, conversion integrity, canonical behavior, or page experience materially regresses.",
      "Stop the experiment if measurement breaks, the page purpose changes mid-window, or another overlapping page experiment starts.",
      "Escalate fair-housing, legal, MLS, advertising, appraisal, valuation, or brokerage-identification questions for human review.",
    ],
    authority: "Internal advisory draft only. It does not authorize a WordPress edit, public publication, redirect, campaign, message, spend, or Production deployment.",
    limitations: [
      "This report contains page metrics, not retained query text, so it cannot prove the exact search intent or prescribe final copy.",
      "Search Console can omit anonymized queries and truncate rows; page-level metrics are directional and do not prove causation.",
      "The brief uses deterministic rules only. No AI/provider call, live-page inspection, database write, or external action occurs.",
    ],
    references: OFFICIAL_REFERENCES,
  };
}

export function formatOrganicSearchExperimentBrief(
  brief: OrganicSearchExperimentBrief,
) {
  const numbered = (items: readonly string[]) =>
    items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");
  return [
    `# Organic search experiment brief`,
    ``,
    `Status: INTERNAL REVIEW ONLY`,
    `Brief version: ${brief.version}`,
    `Page: ${brief.pageUrl}`,
    `Opportunity: ${brief.opportunityType} · score ${brief.opportunityScore} · confidence ${brief.confidencePercent}%`,
    ``,
    `## Source evidence`,
    `- Window: ${brief.evidence.window}`,
    `- Impressions: ${integer(brief.evidence.impressions)}`,
    `- Clicks: ${integer(brief.evidence.clicks)}`,
    `- CTR: ${percent(brief.evidence.ctr)}`,
    `- Average position: ${brief.evidence.averagePosition.toFixed(1)}`,
    `- Internal CTR review threshold: ${percent(brief.evidence.policyCtrThreshold)}`,
    `- Data state / device: ${brief.evidence.dataState} / ${brief.evidence.device}`,
    `- Coverage: ${brief.evidence.coverage.replaceAll("_", " ")}`,
    ``,
    `## Reader task`,
    brief.readerTask,
    ``,
    `## Objective`,
    brief.objective,
    ``,
    `## Hypothesis`,
    brief.hypothesis,
    ``,
    `## Single-change scope`,
    brief.singleChangeScope,
    ``,
    `## Required owner inputs`,
    numbered(brief.requiredInputs),
    ``,
    `## Review steps`,
    numbered(brief.reviewSteps),
    ``,
    `## Measurement`,
    `Primary: ${brief.primaryMetric.label} · baseline ${brief.primaryMetric.baseline}`,
    brief.primaryMetric.decisionRule,
    ``,
    bullets(brief.measurementPlan),
    ``,
    `Diagnostics:`,
    bullets(brief.diagnosticMetrics),
    ``,
    `## Guardrails`,
    bullets(brief.guardrails),
    ``,
    `## Stop conditions`,
    bullets(brief.stopConditions),
    ``,
    `## Authority`,
    brief.authority,
    ``,
    `## Limitations`,
    bullets(brief.limitations),
    ``,
    `## Official references`,
    brief.references.map((reference) => `- [${reference.label}](${reference.href})`).join("\n"),
  ].join("\n");
}
