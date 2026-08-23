# Phase 9 Owned-Demand WordPress Proof Scope — QA Evidence

Recorded 2026-08-22 in America/New_York.

## Result

Release review found one material boundary defect in PR #185: the protected
Distribution Command and server validator accepted `ourtown_wordpress` plus
seven named brokerage placements, but the released Neon ledger constraints
accepted only the original six channels and four generic placements. A valid
WordPress proof would therefore pass application validation and fail at durable
storage.

The repair extends the existing append-only
`owned_demand_publication_proofs` ledger. It does not add a second proof table,
lead store, campaign catalog, publisher, CRM, or WordPress database. It does not
seed proof, mutate a lead, publish a page, send a message, or call a provider.

## Additive migration

- File:
  `supabase/migrations/20260822195000_owned_demand_wordpress_proof_scope.sql`
- SHA-256:
  `9f99315408b5d9b9b4dfbace3c915cdda33247fe66a3348b26486bd896c202ba`
- Predecessor: `20260821170000_owned_demand_publication_proofs.sql`
- Scope: replace six legacy validation constraints with six named, validated
  v2 constraints.
- Preserved: table, UUIDs, rows, indexes, RLS, append-only trigger, RPC,
  service-role SELECT/INSERT-only grants, browser-role denial, audit behavior,
  and test exclusion.

The migration fails closed unless it finds exactly one semantic match for each
legacy constraint. New constraints are added `NOT VALID` and then validated in
the same migration transaction. Existing incompatible data, missing schema, or
constraint drift aborts the transaction.

The new database contract accepts:

- WordPress generic question, seller, buyer, and renter placements;
- homepage Ask Mike;
- established home-value page;
- We Buy Homes;
- Mike agent page;
- listing/buyer CTA;
- rental-to-homeownership CTA; and
- Ask Magic Mike iframe page.

Each placement retains its exact `ourtownproperties` / `owned_media` /
`amm_owned_demand_2026` attribution tuple. Public evidence is restricted to
HTTPS on `ourtownproperties.com` or a subdomain, with userinfo and sensitive
query-key rejection.

## Executable PostgreSQL 17 proof

Docker Desktop was running but its engine did not answer; it was not restarted
or disrupted. PostgreSQL 17.11 was therefore run as an isolated local instance
on loopback. No remote database was linked or queried.

The executable contract
`supabase/tests/owned_demand_publication_proofs_pg17.sql` passed and rolled back
all synthetic mutations. It proves:

- both migration ledger versions are present exactly once;
- RLS remains enabled;
- service role retains SELECT/INSERT only;
- `anon` and `authenticated` cannot read, insert, or execute the RPC;
- all 11 application-resolved WordPress placement/content tuples persist;
- WordPress `live`, `configured`, and `removed` states persist with their exact
  allowed proof types;
- non-WordPress channels cannot use WordPress-only placements, even with a
  syntactically matching channel UTM suffix;
- idempotent replay returns the original record without another audit row;
- a foreign evidence host returns `invalid_publication_proof` and inserts
  nothing;
- each accepted proof creates one minimized immutable audit event;
- updates and deletes fail with SQLSTATE `55000`; and
- every synthetic test row is rolled back.

A separate legacy-compatibility rehearsal inserted one valid synthetic
Facebook proof under the predecessor schema, applied the new migration, and
verified one unchanged retained proof afterward. A second clean rehearsal
executed the production runner's baseline and postflight SQL against an
owner-matched database: six legacy constraints were detected before migration;
six v2 constraints were present and validated afterward; RLS and the immutable
trigger remained enabled.

## Application and runner proof

```text
pnpm exec vitest run \
  tests/scripts/phase9-wordpress-proof-scope-production-cutover.test.ts \
  tests/adminops/owned-demand-publication-proof.test.ts \
  tests/adminops/owned-demand-publication-local-db.test.ts \
  tests/adminops/owned-demand-command.test.ts \
  tests/adminops/owned-demand-activation-loop.test.ts

5 files / 55 tests passed under Node 24.18.0

pnpm run phase9:wordpress-proof-scope:cutover -- --plan

offline plan passed; reviewed migration hash matched; no database connection

pnpm run release:gate

Node 24.18.0: system isolation passed; 14/14 release-safety controls passed;
207 test files / 2,879 tests passed; strict typecheck passed; ESLint passed;
optimized Next.js 15.5.21 build passed; route manifest passed with 80 active
routes and 17 acknowledged root/src duplicates

pnpm audit --prod --audit-level high

no known Production dependency vulnerability

gitleaks git --redact --no-banner

518 commits / approximately 14.16 MB scanned; no leak found
```

The cutover runner requires an unpooled TLS owner connection through a secure
environment, verifies the predecessor and exact legacy boundary, creates a
validated backup, takes advisory and table locks, applies migration plus ledger
entry in one transaction, and proves that lead, audit, proof, function, RLS,
trigger, and privilege state did not drift. Output is redacted and contains no
connection value. Standalone `--verify` reports installed-state postconditions
only; before/after invariants are reported only by the guarded execution that
actually retains both snapshots.

## Security review

- The server action still requires `growth:manage` through server-side RBAC and
  explicit confirmation.
- Runtime validation resolves only catalog-owned channel/placement tuples,
  sanitizes evidence, hashes final copy, and rejects contact data, secrets,
  placeholders, unsupported claims, and fair-housing-risk copy.
- The repository call remains parameterized; raw final copy is not stored.
- The migration does not grant browser access or weaken RLS.
- The cutover runner pins migration bytes, never accepts a database URL as an
  argument, logs only redacted safe identity, and fails unless the exact
  release-specific approval is present.
- No new DOM injection, dynamic execution, wildcard CORS, untrusted redirect,
  public secret, client-side authorization boundary, or arbitrary outbound URL
  was added.

## Production boundary

Production remains unchanged. No Neon migration/write, proof record, lead,
WordPress edit, external publication, email/SMS/Push, QR distribution, spend,
DNS change, or NellySelly action occurred during this repair.

The former application-only PR #185 gate is superseded. After exact-head Node
24 CI, Vercel Preview, protected-flow QA, and final diff review pass, the only
valid release gate is:

```text
APPROVE PHASE 9 OWNED-DEMAND WORDPRESS PROOF MIGRATION, PR 185 MERGE, AND PRODUCTION DEPLOYMENT
```

That gate authorizes only the reviewed migration, exact PR #185 merge, and
canonical application deployment. It does not authorize recording a fabricated
proof or publishing any WordPress, GBP, social, email-signature, or QR asset.

## Rollback

Before commit, any preflight, backup, constraint, validation, or postflight
failure rolls the transaction back. After commit, leave the additive broader
constraints installed if the application is rolled back; the preceding
application ignores the added tuples. Do not delete or edit proof/audit rows.
Prefer a reviewed forward fix over restoring narrower constraints, because a
narrowing rollback could reject legitimate WordPress proof recorded after the
release.
