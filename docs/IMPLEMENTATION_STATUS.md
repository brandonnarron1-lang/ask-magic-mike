# Implementation Status

Updated 2026-08-11.

## Complete locally or evidenced

- Canonical repo and Vercel project identified; rescue branch created.
- Both Ask hostnames serve the correct Ask Magic Mike project; no NellySelly marker
  found in live HTML.
- Our Town remains live WordPress/SEO surface; live phone evidence preserved.
- Atomic Supabase lead capture, attribution, dedupe/fingerprint, routing, audit,
  AdminOps inbox/detail, and notification outbox exist in the canonical codebase.
- Existing release-rehearsal work is preserved; no production mutation performed.

## Same-day changes in this worktree

- Add required route aliases and public buyer/renter/open-house/general/widget surfaces.
- Add local privacy, terms, accessibility, and contact routes linked from the public footer.
- Add consent/test/attribution/click-ID fields and additive migration contract.
- Add internal Mike+BCC outbox delivery and consent-gated consumer acknowledgment
  using the existing provider/retry boundary.
- Add safe event capture, source-preserving widget origin checks, health script, and
  required operating documentation.
- Add deterministic internal visual-email template selection: `hot_priority`
  (80–100), `active_assignment` (60–79), `new_lead` (<60), and `qa_test`.
  The supplied cards are creative references only; their fictional sample lead
  details are never sent. The generated asset is decorative, and all lead facts
  remain accessible HTML/text.
- Keep agent urgency SMS text-only and fail-closed: it requires an approved
  recipient, enabled carrier provider, score ≥60, and a non-test lead. Video is
  intentionally excluded from transactional notifications because it degrades
  email/MMS delivery and does not improve routing accuracy.
- Add the read-only `pnpm amm:health:lead-pipe` monitor and protected retry endpoint
  for `lead_alert` / `consumer_ack` outbox records.

## Neon preview recovery — 2026-08-11

- An isolated Neon Free preview branch, `amm-lead-pipe-preview`, was created in
  the owner-controlled project and received the full canonical migration chain.
  The production Neon branch remains untouched.
- The application now selects a direct, server-only Neon Postgres adapter when
  `DATABASE_URL` is configured. Public capture, appointment requests, the
  protected AdminOps read/mutation functions, reporting reads, and the lead
  notification outbox use that one adapter/database; no browser receives a
  database credential.
- The notification outbox has a Neon repository with idempotency-key conflict
  handling, claim-before-send status updates, bounded retries, provider message
  IDs, and protected recipient references. Email/SMS remain disabled.
- `DATABASE_URL` is stored as a Sensitive, Preview-only Vercel variable. The
  database role credential was rotated and transferred without being printed,
  committed, or written to a local artifact.
- Preview readiness, durable test capture, consent persistence, deterministic
  score/routing, skipped notification outbox records, test suppression, and
  UUID idempotent replay are proven on deployment
  `dpl_EwjyYzJmKCiq1LjzyiJX24zFS3dX`.

## Not yet proven / owner action

- Production deploy and live route repair.
- Neon production migration and data health (the existing Supabase production
  database is not touched).
- Secure recipient/BCC/sender env entry and authenticated provider delivery.
- First QA lead through production and receipt at Mike/BCC.
- Full per-user role-based Hub; current `/admin` MVP is shared Basic Auth.
- WordPress form IDs/notifications/entries-before-email and page-specific publish.

## Database recovery decision

The owner reported that the Supabase project has outstanding invoices and no
funds are available to restore it. `FREE_DATABASE_RECOVERY_PLAN.md` selects
Neon Free PostgreSQL as the no-cost replacement path; it is compatible with the
canonical Postgres schema and Vercel Functions. The owner created the no-cost
Neon project and preview branch, and preview migrations completed. No production
database migration or historic-data copy has been performed.

The public production deployment is currently healthy for `/`, `/ask`, `/sell`, and
`/value`; it remains the prior deployment and still returns 404 for the new `/buy`,
`/rent`, `/open-house/*`, `/widget/v1`, `/robots.txt`, `/sitemap.xml`, and
`/api/health/live` surfaces. The local candidate builds all of those routes plus
`/privacy`, `/terms`, `/accessibility`, and `/contact`.
