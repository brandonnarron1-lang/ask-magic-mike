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

const CURRENT_TAIL_GATE =
  "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT";

const WORDPRESS_GATE =
  "APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION";

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
        : "Preserve this read-only candidate in the ordered release train; do not publish a page or bypass the existing first Production gate.",
      href: "/admin/growth/search-ingress",
    },
    {
      key: "durable_release_train",
      label: "Durable limiter and cumulative release train",
      domain: "govern",
      state: applicationState,
      summary: "The reviewed cumulative candidate adds the Neon-backed limiter, fail-closed readiness, current conversion/accessibility hardening, growth controls, and later sequential improvements without changing Production ahead of the release gate.",
      evidence: [
        "Atomic PR 209 is the first release authority",
        "Exact-head CI, protected no-write Preview QA, rollback, and Neon capability proofs",
        "Later Draft candidates remain ordered and cannot leapfrog the first gate",
      ],
      nextAction: currentTailInProduction
        ? "Keep the durable readiness contract green and release later candidates only in their reviewed order."
        : "Use the existing exact PR 209 gate; do not create another limiter, release vehicle, or competing deployment.",
      href: "/admin/reporting",
      ...(!currentTailInProduction ? { approvalGate: CURRENT_TAIL_GATE } : {}),
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
        : "Preserve the reviewed implementations and release them through the existing ordered train instead of rebuilding nurture or planning features.",
      href: "/admin/revival",
    },
    {
      key: "owned_traffic_publication",
      label: "Owned-traffic publication",
      domain: "activate",
      state: "operator_gate",
      summary: "Source-tagged Ask Magic Mike placements, rollback manifests, creative assets, and publication proof are prepared, but the live WordPress CTA has not been changed.",
      evidence: [
        "Homepage, home-value, We Buy Houses, and agent-page placement audits",
        "Exact current href, replacement href, rollback href, and page fingerprint",
        "Publication authority remains false until the named gate is received",
      ],
      nextAction: "Publish one reversible homepage CTA only after the exact WordPress gate, then verify attribution and canonical storage before expanding placements.",
      href: "/admin/distribution",
      approvalGate: WORDPRESS_GATE,
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
