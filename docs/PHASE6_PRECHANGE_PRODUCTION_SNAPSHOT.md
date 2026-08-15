# Phase 6 Prechange Production Snapshot

Status: baseline captured before Phase 6 material changes.

Captured: 2026-08-15, America/New_York.

This is a read-only Production snapshot. No genuine lead data, Mike account
state, Form 3 activation, consumer automation, carrier SMS, WordPress content,
or NellySelly system was changed while collecting it.

## Canonical release identity

| Item | Verified value |
| --- | --- |
| Repository | `Eyes-Up-Industries/ask-magic-mike` |
| Production commit | `1dd8f35cb1ab1adcacd1292262ca6c01580eb370` |
| Phase 5 runtime merge | `29b6b45c916d1dc9e28fcc76d10c9f4d3db44c8b` |
| Production deployment | `dpl_Ft1cwDHRGe6hCnzTboxqkLxvnit8` |
| Production state | Ready |
| Canonical public URL | `https://www.askmagicmike.com/` |
| Canonical Lead Center | `https://www.askmagicmike.com/admin` |
| Canonical database | Neon project `bitter-star-20214385`, PostgreSQL |
| Canonical WordPress path | Gravity Forms Form 3 only |

Vercel inspection confirmed that the canonical aliases still resolve to the
deployment above. No legacy alias or NellySelly project was connected during
this verification.

## Runtime and funnel health

- Liveness: pass.
- Readiness: pass.
- Production smoke: 19 passed, 2 intentional skips, 0 failed.
- Funnel verification: 15 of 15 passed.
- Production monitor: 9 of 9 passed.
- Browser-authenticated Lead Center Active/New view: empty, with the expected
  `No leads to review` state.
- Public homepage and widget loaded without console errors in the current
  in-app-browser audit run.
- Form 3 remains the sole accepted WordPress bridge path; no WordPress write was
  performed.

The 24-hour Vercel log window contained three PostgreSQL TLS compatibility
warnings and one older lead-enrichment error, all timestamped before the current
Production deployment. The current runtime contains the verified-full database
URL normalization repair. These historical entries are reconciled, not erased;
the post-deployment log window is rechecked at the Phase 6 acceptance gate.

## Lead, queue, and operator state

| Measure | Count/state |
| --- | --- |
| Genuine live prospects | 0 |
| Suppressed QA records | 6 |
| QA records in Active/New | 0 |
| Unsuppressed QA records | 0 |
| Unassigned live leads | 0 |
| Current live notification failures | 0 |
| Current live duplicate suspicions | 0 |
| Brandon | Active, verified Administrator, signed in |
| Mike | Provisioned owner; dormant; no Phase 6 activation action |

No synthetic record was represented as a genuine prospect. Existing QA records
remain test-marked and suppressed.

## Provider and configuration inventory

Vercel Production has sensitive variables configured for Neon, OpenAI, Resend,
Lead Center RBAC, notification controls, and Web Push. Only variable names and
safe enablement metadata were inspected; values were neither exported nor
recorded.

- Resend: existing authenticated provider path present in code and Production
  configuration. Phase 6 Brandon-only test delivery is not yet executed in this
  snapshot.
- OpenAI: `OPENAI_API_KEY` is configured. The existing public chat route still
  uses Chat Completions and therefore requires a Phase 6 Responses API migration.
- SMS: Twilio-capable staff adapter exists, but carrier testing and consumer SMS
  remain disabled for Phase 6. Mock-only testing is required.
- Push: VAPID/Web Push implementation exists. Test leads are explicitly blocked
  from staff push delivery.
- Consumer email/SMS: release-gated and must remain disabled during Phase 6.
- Internal genuine-lead alert: existing production path remains intact.

## Existing implementation to preserve and extend

- Durable Neon lead persistence and source attribution.
- Deterministic scoring and routing.
- Durable `lead_notifications` outbox with idempotency, claim-before-send,
  bounded retries, provider message IDs, and protected status UI.
- Resend, Web Push, and optional Twilio provider adapters.
- Static urgency visual selection and accessible HTML/text lead alerts.
- Existing deterministic lead-intelligence panel and admin RBAC.
- Existing SMS/email template starter registry and mock adapters.

Phase 6 will consolidate on those systems. It will not create a second lead
store, second notification outbox, second admin application, or second public
funnel.

## Visual evidence

Current-run baseline captures are stored under
`output/phase6/screenshots/before/`. Early full-page captures that fired before
lazy media settled are retained as rejected evidence. Accepted, visually
inspected captures include:

- `mobile-390-home-top-after-3s.jpg`
- `mobile-390-widget-top-after-2s.jpg`

The accepted homepage and widget show the current black/gold/ruby brand system,
Mike/Our Town identity, mobile CTA hierarchy, and existing three-path widget.
The complete 320–1920 matrix is recaptured after the Phase 6 implementation
with stable-load checks.

## Change-control boundary

- Working branch: `codex/phase6-funnel-ai-messaging-2026-08-15`.
- Consumer acknowledgment, consumer nurture, carrier SMS, and auto-send remain
  off until separate release gates pass.
- Brandon-only QA recipient will be configured through a server-only secret;
  no recipient value is committed to `.env.example`.
- Mike remains dormant and receives no Phase 6 synthetic/test communication.
- Form 7 entry `1550` remains protected and is not imported or subscribed.
- NellySelly remains outside repository, domain, database, and deployment scope.
