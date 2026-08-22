# Final Implementation Report — Ask Magic Mike Lead Engine

Updated 2026-08-21.

This report is updated at handoff. It must distinguish local proof, staging proof,
and production proof. A synthetic QA record is never described as a live prospect.

## Current truthful result

The canonical repository is deployed at `https://www.askmagicmike.com` on Neon
Free PostgreSQL. Required public routes, durable capture, attribution, consent,
deterministic score/routing, protected AdminOps, outbox state, test suppression,
and production health are verified. The apex redirects to `www`; no Ask hostname
serves NellySelly content. No synthetic record is represented as a live prospect.

External email delivery is proven with a restricted provider key and a
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

- Deployed public routes include `/buy`, `/rent`, `/open-house/[propertyOrId]`,
  `/thank-you`, `/privacy`, `/terms`, `/accessibility`, `/contact`, `/widget/v1`,
  `/robots.txt`, `/sitemap.xml`, `/api/events`, `/api/widget/events`,
  `/api/chat/session`, `/api/chat/message`, `/api/health/live`.
- Lead path: server validation, origin/rate controls, durable capture, additive
  consent/attribution/score enrichment, deterministic Mike fallback routing,
  internal outbox alert, bounded retry, and consent-gated consumer acknowledgment.
- Production baseline PR #181 is merged as
  `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`. Deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM` is Ready and owns the canonical
  hostnames.
- Production Neon migration, secure Vercel environment configuration, and sender
  DNS authentication were completed. The protected Lead Center reads canonical
  Neon data and exposes delivery status/message IDs without recipient references.
- The existing WordPress connector remains bridge-only. Signed bridge 1.1.0
  forwards approved Home Value Form 3 into the canonical API; Gravity Forms
  retains its local entry, and the duplicate Form 3 native notification is
  inactive. Forms 1, 2, and 4–7 remain outside the forwarding allowlist.

PR #183 is the next gated application release. PR #184 is stacked on it and
adds the guarded publication-proof ledger migration. Neither candidate is
Production, and neither authorizes external publication or a consumer send.

The latest aggregate Production observation contains only six
suppressed/test leads and no contactable live prospect. The funnel is available
for genuine submissions; no synthetic QA record is counted as public demand.

## Production proof fields

Production QA lead IDs, exact subject, provider message ID, delivery status,
idempotent replay, authenticated Lead Center checks, and audit-mailbox receipt are
recorded in `QA_EVIDENCE.md`. The private BCC value and all credentials remain
outside source, logs, and this report.
