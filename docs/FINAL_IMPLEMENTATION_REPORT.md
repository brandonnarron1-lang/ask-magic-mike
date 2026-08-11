# Final Implementation Report — Ask Magic Mike Lead Engine

This report is updated at handoff. It must distinguish local proof, staging proof,
and production proof. A synthetic QA record is never described as a live prospect.

## Current truthful result

The canonical repository is deployed at `https://www.askmagicmike.com` on Neon
Free PostgreSQL. Required public routes, durable capture, attribution, consent,
deterministic score/routing, protected AdminOps, outbox state, test suppression,
and production health are verified. The apex redirects to `www`; no Ask hostname
serves NellySelly content. No synthetic record is represented as a live prospect.

External email delivery is now proven with a restricted replacement key and a
verified aligned sending subdomain. The final test-marked public submission has
one canonical lead, one internal alert, one provider message ID, provider event
`delivered`, and one confirmed hidden copy in the approved audit mailbox.

## Evidence location

- Repository and live triage: `docs/CANONICAL_ASSET_MANIFEST.md`,
  `docs/LIVE_TRIAGE_2026-08-10.md`.
- Design/contracts: `docs/ARCHITECTURE.md`, `docs/EMAIL_DELIVERY_SPEC.md`,
  `docs/LEAD_ROUTING_RULES.md`, `docs/WIDGET_INTEGRATION.md`.
- Go-live and verification: `docs/QA_EVIDENCE.md`, `docs/GO_LIVE_RUNBOOK.md`,
  `docs/ROLLBACK_PLAN.md`.

## Deployed result

- Public routes added locally: `/buy`, `/rent`, `/open-house/[propertyOrId]`,
  `/thank-you`, `/privacy`, `/terms`, `/accessibility`, `/contact`, `/widget/v1`,
  `/robots.txt`, `/sitemap.xml`, `/api/events`, `/api/widget/events`,
  `/api/chat/session`, `/api/chat/message`, `/api/health/live`.
- Lead path: server validation, origin/rate controls, durable capture, additive
  consent/attribution/score enrichment, deterministic Mike fallback routing,
  internal outbox alert, bounded retry, and consent-gated consumer acknowledgment.
- Production deployment `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt` is Ready and
  aliased to the canonical hostname.
- Production Neon migration, secure Vercel environment configuration, and sender
  DNS authentication were completed. WordPress was not published or changed.

## Production proof fields

Production QA lead IDs, exact subject, provider message ID, delivery status,
idempotent replay, authenticated Lead Center checks, and audit-mailbox receipt are
recorded in `QA_EVIDENCE.md`. The private BCC value and all credentials remain
outside source, logs, and this report.
