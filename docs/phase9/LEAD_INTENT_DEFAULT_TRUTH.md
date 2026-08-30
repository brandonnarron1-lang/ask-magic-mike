# Phase 9 lead-intent default truth

Captured: 2026-08-29 EDT

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
- An untouched buyer preapproval checkbox serialized as `false`, asserting a
  negative financing fact even though the consumer had not answered it.

Those values were serialized and persisted on an otherwise untouched form.
Timeline is not decorative context: deterministic scoring assigns 30 points to
`ASAP` and 22 points to a 30–90 day range. With the current factor weights, a
seller who supplied only phone, property, and seller intent could be recorded
at score 75 instead of the truthful 45. A comparable buyer record could be
recorded at 62 instead of 40. The canonical API also mapped an absent or
unrecognized timeline to 24 months, collapsing unknown evidence into an
asserted planning horizon. Explicit `not sure` and `unknown` text was also
collapsed into 24 months.

This affected source-of-truth quality, priority bands, qualification grade,
alert urgency, SLA interpretation, analytics, and downstream allocation. It
could make operators act on urgency the consumer never expressed.

## Implemented correction

- Seller condition and timeline now begin with explicit, blank, optional
  prompts.
- Buyer timeline and financing context now begin with explicit, blank,
  optional prompts.
- Untouched optional values are omitted from the browser payload.
- An unchecked buyer preapproval affirmation is omitted; only a checked box
  serializes `preapproval: true`.
- Missing, unrecognized, and explicitly uncertain timelines persist as
  `null`. Only an actual planning-horizon answer such as `Just planning`,
  `Next year`, or `12+ months` maps to the 24-month compatibility value.
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

Reconciled Node 24.18.0 verification:

- focused lead/form matrix: 4 files / 48 tests passed;
- omitted and explicitly uncertain timeline variants persist as `null` and
  score zero timeline points;
- untouched preapproval is absent while an affirmative check remains `true`;
- exact-head suite, build, CI, immutable Preview, protected browser, security,
  isolation, and runtime-log acceptance are recorded in PR #224's immutable
  release evidence before promotion.

Exact-head hosted evidence is deliberately PR-bound because the final commit
identity and immutable deployment do not exist until after this file is
committed.

## Rollback

Revert this candidate's application commit to restore the parent behavior. No
database, provider, environment, DNS, WordPress, lead, or notification rollback
is required. Existing records remain untouched in either direction.

## Release boundary

This stacked candidate cannot leapfrog its parent release train. Production
remains unchanged. Exact-head CI, immutable Preview, protected no-write browser
QA, and the established explicit Production approval gate remain mandatory.
