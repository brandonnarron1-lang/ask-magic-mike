# Phase 9 owned-demand readiness authority — QA evidence

Date: 2026-08-30

Mode: authenticated Production observation, public WordPress precondition reads,
and local implementation/visual QA

External mutation: none

## Decision

Reuse the existing protected Distribution Command and WordPress readiness
manifests. Do not create another funnel, widget, publisher, database, campaign
manager, or proof ledger.

The Production activation loop had enough attribution and publication-proof
truth to avoid inventing demand, but it did not consume the already-built
WordPress readiness manifests when selecting its next placement. That allowed
the hidden homepage CTA to be presented as the next operator decision even
though its exact manifest was publication-blocked.

## Current Production evidence

Authenticated read-only inspection found:

- `/admin/reporting`: zero eligible live leads and no reporting rows;
- `/admin/growth`: zero eligible live leads, zero measured baselines, and
  30 metrics still collecting;
- `/admin/distribution`: 35 prepared placements, zero active proof, and the
  hidden homepage placement selected as the next decision;
- `/admin/experiments`: zero registered experiments and the master switch off.

The correct constraint is first owned-demand activation, not another scoring,
dashboard, AI, notification, or database feature.

## Exact live WordPress readiness

The existing allowlisted manifest implementation performed bounded GET-only
reads of the three reviewed brokerage pages and one shared WordPress page
index. It returned:

| Placement | Page | Status | Visibility | Activation decision |
| --- | ---: | --- | --- | --- |
| Homepage Ask Magic Mike | 149 | `hidden_target` | `hidden_by_known_css` | Hold |
| Established home-value page | 3952 | `legacy_match_ready` | `visible_candidate` | Eligible for exact review |
| We Buy Homes | 3631 | `legacy_match_ready` | `visible_candidate` | Eligible for exact review |

Every manifest reported `mutationPerformed=false`. No raw page HTML, consumer
data, credential, recipient address, or secret entered the evidence output.

## Implementation

- The manifest loader now reads the public WordPress page index once for all
  three exact targets instead of repeating the same index request.
- Each manifest is converted to a typed placement-readiness decision.
- The activation loop retains lifecycle state and native-proof history, but a
  `prepared_not_observed` placement cannot become the next recommendation when
  its exact readiness decision is blocked.
- The detailed ledger displays a `Readiness hold` badge and safe reason.
- With the live statuses above, the next recommendation becomes the existing
  home-value page instead of the hidden homepage CTA.
- If public readiness cannot be read, the affected targets fail closed; the
  system never treats a fetch failure as publication readiness.

This changes recommendation authority only. It cannot publish, edit
WordPress, record proof, create a lead, send a message, or authorize a campaign.

## Existing homepage restoration packet

The separate reviewed restoration packet was revalidated against the live
plugin editor without saving:

- deployed plugin: `2.10.0`;
- live SHA-256:
  `41de351d57e91b8ecf1d611d8b052381166effaf693319b0f9e8da32f5d8e972`;
- proposed `2.10.1` SHA-256:
  `6b9a30de24e3fbbbac5aa49def7552afd6b2e21b7ede7beafa8ad095d9a9f44c`;
- exact source and proposed hashes matched the reviewed packet;
- one CTA hide rule is removed while the independent floating-widget hide
  guard remains present once.

An isolated, no-script, no-frame, no-form-action local preview proved the
existing CTA visible at desktop and mobile breakpoints. The mobile card was
355 pixels wide in a 390-pixel viewport with no horizontal overflow, and its
primary action measured 317 by 76 pixels. The public brokerage number remained
`252-243-7700`, and the existing tracked href was deliberately unchanged.

This preview does not authorize the WordPress save. The restoration remains a
separate exact WordPress action with its own rollback and approval gate.

## Focused verification

```text
Vitest: 3 files / 47 tests passed
Strict TypeScript: passed
git diff --check: passed
```

## Exact-head release verification

Completed at 2026-08-30 10:20 EDT on commit `76bd328`:

```text
System-isolation verification: passed
Release safety: 14/14 checks passed
Vitest: 278 files / 3,427 tests passed
Strict TypeScript: passed
ESLint: passed
Next.js 15.5.21 production build: passed (60/60 static pages)
Route manifest: passed (100 active routes; 22 acknowledged duplicates)
Dependency audit at high severity: no known vulnerabilities
git diff --check: passed
```

Hosted Preview, protected browser QA, and runtime-log review remain required
before this stacked candidate can become mergeable. Its parent PR 244 also
remains subject to its own exact owner approval before merge or Production
deployment.

## Boundary

No Production deployment, WordPress save, page/form/plugin mutation, cache
purge, database write, lead submission, email/SMS/Web Push, provider call,
publication-proof write, social/GBP publication, DNS change, spend, deletion,
purchase, or NellySelly action occurred.
