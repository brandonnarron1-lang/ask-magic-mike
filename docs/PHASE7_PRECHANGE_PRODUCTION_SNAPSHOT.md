# Phase 7 Prechange Production Snapshot

Captured: 2026-08-16, America/New_York.

Status: verified before Phase 7 material changes. This snapshot is read-only and
contains no secrets, hidden BCC value, session material, genuine lead PII, or
provider credentials.

## Canonical release identity

| Item | Verified value |
| --- | --- |
| Repository | `https://github.com/brandonnarron1-lang/ask-magic-mike` |
| `main` commit | `c1648137b6a7ca3be947e3e0872f35dd671a1b93` |
| Phase 7 branch | `codex/phase7-messaging-ai-release-candidate-2026-08-16` |
| Production deployment | `dpl_4XPwv6Z1pNWs3zHnXsPNm5Se5gWS` |
| Production state | Ready |
| Production origin | `https://www.askmagicmike.com` |
| Database | Neon PostgreSQL, project `bitter-star-20214385` |
| Production branch | `br-round-base-auh6h2wd` |
| WordPress path | Gravity Forms Form 3 only |

The branch was created directly from the verified `origin/main` commit. Existing
untracked Phase 5 and Phase 6 package files were preserved unchanged.

## Runtime and public funnel

- Liveness: HTTP 200; canonical service identity; database configured as
  `neon_postgres`; notification mode `production`; internal email enabled.
- Readiness: HTTP 200; database, canonical capture function, leads table,
  notification table, RBAC schema, Web Push schema, and phone setup all ready.
- Production smoke: 19 passed, 2 intentional read-only skips, 0 failed.
- Live conversion funnel: 15 passed, 0 failed.
- Point-in-time production monitor: 9 passed, 0 failed.
- Lead-pipe route health: 9 passed, 0 failed.
- Production error logs, preceding 24 hours: 0.
- Production warning logs, preceding 24 hours: 0.
- PostgreSQL TLS warnings in the inspected window: 0.

## Production lead and queue state

The authenticated Lead Center is the current observable source for this
prechange count because Vercel Sensitive environment values cannot be exported
by the CLI. The signed-in production views show:

| Measure | Current evidence |
| --- | --- |
| Genuine live prospects | 0 `LIVE` badges; reporting volume 0 |
| QA records | 6 `TEST` badges in the All view |
| Active/New review queue | Empty; `No leads to review` |
| Genuine unassigned leads | 0 observable live records |
| Open daily actions | 0 |
| Pending notification retries | 0 |
| Notification records | 7 total: 3 sent, 2 skipped, 2 historical permanently failed |
| Current live notification failures | 0; the two visible failures belong to prior QA history |

All six QA records remain visibly labeled test and are excluded from current
reporting. No synthetic record is represented as a genuine prospect.

## Provider and feature-control inventory

Vercel Production contains Sensitive variables for canonical Neon, Resend,
OpenAI, Better Auth, WordPress bridge signing, QA email controls, Web Push, and
internal notification controls. Only names and safe enablement metadata were
inspected.

- Resend sending identity and API configuration are present. The current
  Brandon-only QA route is independently gated by QA enablement, Production QA
  enablement, an authenticated bearer, one approved allowlisted recipient, and
  a test-recipient override.
- No Resend webhook signing secret is present in the current Production variable
  inventory. Phase 7 must ship and verify the handler before creating or
  enabling a provider webhook.
- OpenAI API access is present. Existing Phase 6 code uses the Responses API,
  strict structured output, `store: false`, a bounded timeout, and deterministic
  fallback.
- Consumer acknowledgment, nurture, carrier SMS, sequence auto-send, and AI
  automatic actions remain disabled.
- Mike remains dormant. No Phase 7 QA message, reset, activation, Push, or
  preview has been requested for Mike.

## Visual baseline

Current-run accepted screenshots are under `output/phase7/screenshots/before/`.
They cover the homepage, Sell, Value, Buy, Ask, Widget, Lead Center Active/New,
and Message Review Studio at 390 px and 1440 px where applicable.

The production UI preserves the established black, warm ivory, gold, and ruby
system; the verified Mike portrait; the Our Town logo; strong serif headlines;
and mobile-first conversion controls. Phase 7 will refine this system rather
than replace it.

## Isolation and change-control boundary

- Ask Magic Mike remains linked only to the canonical GitHub repository, Vercel
  project, domains, and Neon project.
- `pnpm run amm:verify:isolation` passes.
- No NellySelly hostname, repository, database, environment variable, project,
  or deployment alias is in the Phase 7 runtime path.
- Consumer email, consumer nurture, consumer SMS, carrier SMS, and Mike account
  activation remain outside this release.
- Form 3 stays active and canonical. Forms 1, 2, 5, 6, and 7 remain held for
  technical mapping only. Form 4 remains a separate recruiting workflow. Form 7
  entry `1550` remains protected and not subscribed.
