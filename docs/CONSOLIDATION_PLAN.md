# Consolidation Plan

## Canonical decision

Use `/Users/brandonnarron/Projects/ask-magic-mike` as the canonical repository.
It is the only local candidate with the mature public funnel, atomic Supabase
lifecycle, attribution, scoring, routing, AdminOps pages, notification outbox,
Vercel project linkage, and tests. The current working branch is
`rescue/amm-pre-consolidation-20260810-162915`, created from the pre-existing dirty
release-rehearsal worktree before edits.

## Merge order

1. Preserve existing uncommitted release-rehearsal files and current branch history.
2. Make the root `app/` router explicit because the generated route manifest shows
   it is the active deployment router; keep `src/app/` as reference/shared modules.
3. Add additive canonical lead fields and the notification/analytics contracts.
4. Wire public seller, buyer, general, and widget forms through `/api/leads`.
5. Add root aliases for the required health, events, chat-session/message, widget,
   thank-you, robots, and sitemap surfaces.
6. Reuse the existing outbox/retry provider; add a separate internal alert and
   consent-gated consumer acknowledgment rather than a second mailer.
7. Use the WP package as a bridge contract only. Do not activate its local
   `amm_leads` store or duplicate notifications.
8. Run local tests/build and prepare a protected preview. Production deployment,
   live migration, email, and WordPress publication remain approval gates.

## Systems intentionally not merged

- The two-commit bootstrap repo is not a source of truth.
- NellySelly projects remain separate and receive no Ask domain alias.
- Old static/product-page packages are reference assets, not applications.
- No second CRM, spreadsheet, Constant Contact database, or WordPress lead table
  is created by the canonical implementation.

## Migration risk and rollback

The additive migration adds nullable/defaulted attribution, consent evidence,
test-lead, score, and notification-recipient capabilities. It does not delete or
rewrite existing leads. Apply it only to the approved staging/production database
after verifying the target Supabase project. Roll back by restoring the prior Vercel
deployment and, if necessary, dropping only the newly added objects using the
migration's commented rollback section; retain lead/audit data.
