# Phase 9 lead-intent default truth

Captured: 2026-08-28 EDT

Production mutation: none

## Reuse decision

This candidate extends the existing Seller and Buyer intake components,
canonical `/api/leads` lifecycle command, deterministic scoring engine, and
current test suites. It does not add a new form, funnel, database, CRM, score,
router, notification service, provider, or visual system.

## Defect found in the current release candidate

The rendered forms visually preselected facts that a consumer had not stated:

- Seller defaulted condition to `Move-in ready` and timeline to `ASAP`.
- Buyer-family intake defaulted timeline to `30-60 days` and financing to
  `Not sure yet`.

Those values were serialized and persisted on an otherwise untouched form.
Timeline is not decorative context: deterministic scoring assigns 30 points to
`ASAP` and 22 points to a 30–90 day range. With the current factor weights, a
seller who supplied only phone, property, and seller intent could be recorded
at score 75 instead of the truthful 45. A comparable buyer record could be
recorded at 62 instead of 40. The canonical API also mapped an absent or
unrecognized timeline to 24 months, collapsing unknown evidence into an
asserted planning horizon.

This affected source-of-truth quality, priority bands, qualification grade,
alert urgency, SLA interpretation, analytics, and downstream allocation. It
could make operators act on urgency the consumer never expressed.

## Implemented correction

- Seller condition and timeline now begin with explicit, blank, optional
  prompts.
- Buyer timeline and financing context now begin with explicit, blank,
  optional prompts.
- Untouched optional values are omitted from the browser payload.
- Missing or unrecognized timelines persist as `null`; only an explicit
  planning/unknown answer maps to the 24-month compatibility value.
- An unknown timeline remains an explainable score factor but contributes zero
  points.
- Seller A-grade urgency requires an explicit timeline at or below three
  months. A contactable seller with property context and no stated timeline
  remains qualified at grade B.

No existing Production row is scanned, rewritten, merged, or deleted. This is
a forward-only application correction and requires no database migration.

## Visual acceptance

The current immutable Preview and corrected local candidate were captured in
the same in-app browser at the same 390×844 viewport. Seller and Buyer pages
retain the existing Black Diamond structure, spacing, typography, field sizes,
consent copy, CTA hierarchy, footer, and mobile containment. The only intended
visual changes are the optional labels and truthful blank prompts.

Gitignored local evidence:

- `/tmp/ask-magic-mike-ux-audit-20260828/11-sell-before-exact-viewport.png`
- `/tmp/ask-magic-mike-ux-audit-20260828/12-sell-after-exact-viewport.png`
- `/tmp/ask-magic-mike-ux-audit-20260828/13-buy-before-exact-viewport.png`
- `/tmp/ask-magic-mike-ux-audit-20260828/14-buy-after-exact-viewport.png`

No form, lead, appointment, chat, email, SMS, Push notification, provider,
WordPress, DNS, database, or Production action was performed during visual QA.
Normal page initialization attempted only the candidate's existing Preview
telemetry boundary; Preview remained configured read-only.

## Automated acceptance

Node 24 local verification:

- focused lead/form matrix: 4 files / 44 tests passed;
- complete Vitest suite: 263 files / 3,290 tests passed;
- strict TypeScript: passed;
- ESLint: passed;
- optimized Next.js 15.5.21 build: passed;
- route manifest: 95 active / 17 acknowledged duplicate roots;
- release safety: 14 / 14 passed;
- deployable-source NellySelly isolation: passed;
- Production dependency audit: no known vulnerabilities;
- full Git-history Gitleaks scan: 643 commits, no leaks found.

Pre-commit release doctor is healthy with one expected nonblocking finding:
the candidate tree is intentionally dirty before commit. Release authority is
`LOCAL_READY`; exact-head Preview QA cannot exist until the branch is committed,
pushed, and receives its immutable Vercel Preview.

## Rollback

Revert this candidate's application commit to restore the parent behavior. No
database, provider, environment, DNS, WordPress, lead, or notification rollback
is required. Existing records remain untouched in either direction.

## Release boundary

This stacked candidate cannot leapfrog its parent release train. Production
remains unchanged. Exact-head CI, immutable Preview, protected no-write browser
QA, and the established explicit Production approval gate remain mandatory.
