import {
  CURRENT_CUMULATIVE_RELEASE_GATE,
  CURRENT_RELEASE_AUTHORITY,
} from "./current-release-authority";

export const GROWTH_CAPABILITY_STATES = [
  "production_live",
  "release_candidate",
  "operator_gate",
  "host_gate",
  "external_dependency",
  "prohibited",
] as const;

export type GrowthCapabilityState = (typeof GROWTH_CAPABILITY_STATES)[number];

export type GrowthCapabilityDomain =
  | "capture"
  | "respond"
  | "measure"
  | "activate"
  | "integrate"
  | "govern";

export interface GrowthCapabilityLedgerItem {
  key: string;
  label: string;
  domain: GrowthCapabilityDomain;
  state: GrowthCapabilityState;
  summary: string;
  evidence: readonly string[];
  nextAction: string;
  href: string;
  approvalGate?: string;
}

export interface GrowthCapabilityLedger {
  generatedFor: "production" | "preview_or_local";
  items: GrowthCapabilityLedgerItem[];
  counts: Record<GrowthCapabilityState, number>;
}

const CURRENT_WORDPRESS_GATE =
  "APPROVE PHASE 9 OUR TOWN BASIC CONSENT BRIDGE 1.2.0 INSTALLATION, LEGACY GTM REMOVAL, AND CONTROLLED RUNTIME QA";

function currentApplicationState(
  currentTailInProduction: boolean,
): GrowthCapabilityState {
  return currentTailInProduction ? "production_live" : "release_candidate";
}

export function growthCapabilityStateLabel(state: GrowthCapabilityState) {
  const labels: Record<GrowthCapabilityState, string> = {
    production_live: "Production live",
    release_candidate: "Reviewed candidate",
    operator_gate: "Operator approval required",
    host_gate: "Hosting action required",
    external_dependency: "External dependency",
    prohibited: "Intentionally prohibited",
  };
  return labels[state];
}

export function buildGrowthCapabilityLedger({
  currentTailInProduction,
}: {
  currentTailInProduction: boolean;
}): GrowthCapabilityLedger {
  const applicationState = currentApplicationState(currentTailInProduction);
  const items: GrowthCapabilityLedgerItem[] = [
    {
      key: "canonical_lead_pipe",
      label: "Canonical lead pipe",
      domain: "capture",
      state: "production_live",
      summary: "Public intake, durable canonical storage, attribution, consent evidence, deterministic score/routing, Lead Center visibility, and notification outbox share one system of record.",
      evidence: [
        "Ask Magic Mike public funnels and canonical lead API",
        "Neon production lead, event, notification, and audit records",
        "Protected Lead Center and deterministic assignment rules",
      ],
      nextAction: "Monitor storage, delivery, duplicate, and SLA health; do not build another lead database or intake stack.",
      href: "/admin/leads",
    },
    {
      key: "wordpress_form3_bridge",
      label: "Our Town Form 3 bridge",
      domain: "capture",
      state: "production_live",
      summary: "The proven signed WordPress bridge forwards the approved home-value form into the canonical backend while preserving the WordPress entry and preventing duplicate native alerts.",
      evidence: [
        "Gravity Form 3 is the only approved canonical forwarding allowlist entry",
        "Signed forwarding, retry visibility, source attribution, and controlled QA evidence",
        "Forms 1, 2, and 4–7 remain outside the allowlist pending consent decisions",
      ],
      nextAction: "Preserve Form 3 and expand one named form at a time only after consent language and one-form acceptance are approved.",
      href: "/admin/distribution",
    },
    {
      key: "closed_loop_measurement",
      label: "Outcome and response intelligence",
      domain: "measure",
      state: "production_live",
      summary: "The protected operating layer records outcomes, attributed revenue, immutable first-human response milestones, and evidence maturity without inventing missing economics.",
      evidence: [
        "Outcome ledger and attributed-revenue migrations",
        "P50, P75, and P90 first-human-response evidence",
        "Test and communication-suppressed records excluded from business KPIs",
      ],
      nextAction: "Accumulate genuine demand and record operational outcomes so baselines become measurable before targets are approved.",
      href: "/admin/growth",
    },
    {
      key: "organic_search_experiment_briefs",
      label: "Organic page experiment briefs",
      domain: "measure",
      state: applicationState,
      summary: "Validated Search Console page evidence now produces deterministic internal experiment briefs with owner-input requirements, one-variable scope, outcome-aware measurement, guardrails, and stop conditions; it does not generate final public copy or publish anything.",
      evidence: [
        "Existing privacy-minimized organic-search ingress remains the only source of page metrics",
        "Page-specific decision packets retain no query text, raw CSV, consumer PII, or provider payload",
        "Google-aligned people-first review, qualified-outcome diagnostics, accessibility checks, and explicit authority boundaries",
      ],
      nextAction: currentTailInProduction
        ? "Use the protected workbench to prepare one owner-reviewed page experiment at a time, then request the separate publication authority only after Preview and compliance review."
        : `Preserve this read-only capability inside cumulative PR ${CURRENT_RELEASE_AUTHORITY.candidate.pr}; do not publish a page or treat an experiment packet as release authority.`,
      href: "/admin/growth/search-ingress",
    },
    {
      key: "ordered_release_train",
      label: "Accepted Production and cumulative release candidate",
      domain: "govern",
      state: applicationState,
      summary: `PR ${CURRENT_RELEASE_AUTHORITY.production.pr} is accepted in Production. PR ${CURRENT_RELEASE_AUTHORITY.candidate.pr} consolidates the reviewed Phase 9 component train into one exact-head application candidate with one guarded four-migration cutover.`,
      evidence: [
        `PR ${CURRENT_RELEASE_AUTHORITY.production.pr} is live at ${CURRENT_RELEASE_AUTHORITY.production.mergeCommit} on ${CURRENT_RELEASE_AUTHORITY.production.deploymentId}; its gate is consumed`,
        `PR ${CURRENT_RELEASE_AUTHORITY.candidate.pr} exact head ${CURRENT_RELEASE_AUTHORITY.candidate.head} is the single cumulative application candidate`,
        `Component PRs ${CURRENT_RELEASE_AUTHORITY.consolidatedComponentTrain.firstPr}–${CURRENT_RELEASE_AUTHORITY.consolidatedComponentTrain.lastPr} remain preserved lineage with no independent current release authority`,
      ],
      nextAction: currentTailInProduction
        ? "Verify the deployed commit, health, protected boundaries, migrations, and rollback evidence before considering any separately gated import or external action."
        : `Use only the guarded PR ${CURRENT_RELEASE_AUTHORITY.candidate.pr} cutover after its exact approval. Do not merge component PRs individually or reuse their historical gates.`,
      href: "/admin/reporting",
      ...(!currentTailInProduction ? { approvalGate: CURRENT_CUMULATIVE_RELEASE_GATE } : {}),
    },
    {
      key: "revival_and_review_planner",
      label: "Database revival and recurring-value planner",
      domain: "activate",
      state: applicationState,
      summary: "A permission-aware, read-only revival command and device-private public review planner already exist in the ordered candidate train; neither sends messages or creates a parallel CRM.",
      evidence: [
        "Deterministic dormant cohorts with permission, retention, ownership, task, and sequence conflicts",
        "Internal drafts labeled not approved for send",
        "Device-private seller, buyer, homeowner, and relocation planning route",
      ],
      nextAction: currentTailInProduction
        ? "Collect real planner engagement and review eligible revival evidence before proposing any bounded consumer pilot."
        : `Preserve these reviewed implementations inside cumulative PR ${CURRENT_RELEASE_AUTHORITY.candidate.pr} instead of rebuilding nurture or planning features.`,
      href: "/admin/revival",
    },
    {
      key: "wordpress_consent_and_owned_traffic",
      label: "Our Town consent bridge and owned traffic",
      domain: "activate",
      state: "operator_gate",
      summary: "The signed Form 3 bridge is live. Basic-consent bridge 1.2.0, legacy GTM removal, controlled runtime QA, and later source-tagged owned-traffic publication remain separate reversible WordPress actions.",
      evidence: [
        "Form 3 signed forwarding is accepted and remains unchanged",
        "Consent bridge 1.2.0 package, legacy GTM inventory, rollback, and runtime QA contract are prepared",
        "Homepage and selected page publication remains a later independent action after consent-runtime acceptance",
      ],
      nextAction: "Run only the exact consent-bridge, GTM-removal, and controlled-QA gate first. Treat any later homepage or page-placement publication as a separate approval and acceptance cycle.",
      href: "/admin/distribution",
      approvalGate: CURRENT_WORDPRESS_GATE,
    },
    {
      key: "facebook_preview_recovery",
      label: "Our Town Facebook preview recovery",
      domain: "integrate",
      state: "host_gate",
      summary: "The exact Apache authz denial is proven. The approved account-level test parsed but could not supersede the earlier server-global authorization decision, so the byte-identical backup was restored; root/WHM execution is still required.",
      evidence: [
        "Production matrix remains 40/42",
        "Approved account-scoped test completed and rolled back on 2026-08-28",
        "Supported per-vhost include is root-owned and unavailable to the cPanel account",
      ],
      nextAction: "Have a root/WHM hosting administrator apply the reviewed per-vhost include, run configtest and a graceful reload, then require 42/42 plus sensitive-route regression proof. Do not attempt another WordPress or .htaccess workaround.",
      href: "/admin/distribution",
    },
    {
      key: "property_listing_alerts",
      label: "Property and homeowner alerts",
      domain: "integrate",
      state: "external_dependency",
      summary: "Permission purposes and no-send templates exist, but real alerts require a licensed listing/property source, approved field/display rules, explicit preferences, frequency, and consumer permission.",
      evidence: [
        "Property-alert purpose is separate from requested-service and marketing permission",
        "Public listing routes fail safely when no approved provider is configured",
        "No inventory, valuation, or availability may be fabricated",
      ],
      nextAction: "Select an authorized MLS/IDX or property-data path and approve its field map, display rules, preference model, and test-mode delivery contract.",
      href: "/admin/growth/vendor-ingress",
    },
    {
      key: "portal_and_ad_feedback",
      label: "Portal webhooks and ad conversion feedback",
      domain: "integrate",
      state: "external_dependency",
      summary: "The vendor-neutral contract lab, spend ingress, outcome ledger, and idempotency model are built; live webhooks and conversion uploads still require provider contracts, credentials, signatures, approved field maps, and privacy review.",
      evidence: [
        "Test-only provider contract lab",
        "Minimized normalized payloads with no raw consumer-payload retention",
        "No live provider activation or conversion upload authority",
      ],
      nextAction: "Choose one provider and obtain its approved test account, contract, webhook secret, event map, and retention rules before implementing a signed edge adapter.",
      href: "/admin/growth/vendor-ingress",
    },
    {
      key: "consumer_nurture",
      label: "Consumer nurture and acknowledgments",
      domain: "respond",
      state: "operator_gate",
      summary: "Permission-aware templates, sequence state, suppression, provider events, and retry machinery exist, while consumer delivery remains disabled pending a named purpose, cohort, channel, template, cap, sender, monitoring window, and exact approval.",
      evidence: [
        "Requested-service, appointment, property-alert, and marketing purposes remain separate",
        "AI may draft but cannot send, decide consent, assign, score, or schedule",
        "Internal alerts and consumer acknowledgments are separate notification records",
      ],
      nextAction: "Start only with an unmistakably synthetic test or a separately approved, tightly bounded consumer pilot; do not enable global nurture.",
      href: "/admin/message-previews",
    },
    {
      key: "autonomous_external_actions",
      label: "Autonomous spend, sending, and publication",
      domain: "govern",
      state: "prohibited",
      summary: "Unrestricted consumer sending, paid-budget changes, public publishing, deterministic-rule overrides, and protected-class targeting are intentionally outside system authority.",
      evidence: [
        "Human approval remains separate from observation, calculation, recommendation, and drafting",
        "No AI assignment, score, consent, valuation, offer, spend, or send authority",
        "Paid media and public publication remain explicitly gated",
      ],
      nextAction: "Keep these actions prohibited unless a future action-class policy defines caps, stop conditions, audit, rollback, legal approval, and exact execution authority.",
      href: "/admin/action-queue",
    },
  ];

  const counts = Object.fromEntries(
    GROWTH_CAPABILITY_STATES.map((state) => [
      state,
      items.filter((item) => item.state === state).length,
    ]),
  ) as Record<GrowthCapabilityState, number>;

  return {
    generatedFor: currentTailInProduction ? "production" : "preview_or_local",
    items,
    counts,
  };
}
